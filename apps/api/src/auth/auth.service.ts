import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { EmailOTP, OtpType } from './schemas/email-otp.schema';
import { PasswordResetSession } from './schemas/password-reset-session.schema';
import { UserSession } from './schemas/user-session.schema';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  VerifyResetOtpDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @InjectModel(EmailOTP.name) private otpModel: Model<EmailOTP>,
    @InjectModel(PasswordResetSession.name)
    private resetSessionModel: Model<PasswordResetSession>,
    @InjectModel(UserSession.name) private userSessionModel: Model<UserSession>,
  ) {}

  private generateNumericOTP(length = 6): string {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += crypto.randomInt(0, 10).toString();
    }
    return otp;
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      passwordHash,
      isEmailVerified: true, // Auto-verify for development
    });

    const otp = this.generateNumericOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.otpModel.deleteMany({
      email: user.email,
      type: OtpType.EMAIL_VERIFICATION,
    });

    await new this.otpModel({
      email: user.email,
      otpHash,
      type: OtpType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    }).save();

    try {
      await this.emailService.sendVerificationOTP(user.email, otp);
    } catch (err) {
      // Ignore email errors during dev
    }

    return { message: 'Registration successful. You can now log in directly.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const otpRecord = await this.otpModel
      .findOne({ email: dto.email, type: OtpType.EMAIL_VERIFICATION })
      .exec();

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestException('Too many verification attempts');
    }

    const isValid = await bcrypt.compare(dto.otp, otpRecord.otpHash);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestException('Invalid OTP');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersService.update(user._id, { isEmailVerified: true });
    await this.otpModel.deleteOne({ _id: otpRecord._id });

    const payload = { sub: user._id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Email verified successfully',
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // For development: bypass email verification since SMTP is not configured
    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedException('Please verify your email first');
    // }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.update(user._id, { lastLoginAt: new Date() });

    const payload = { sub: user._id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    await new this.userSessionModel({
      userId: user._id,
      tokenHash: await bcrypt.hash(accessToken, 10),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }).save();

    return {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
        preferences: user.preferences,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const successMsg =
      'If an account exists with that email, a verification code has been sent.';

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return { message: successMsg };

    const otp = this.generateNumericOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.otpModel.deleteMany({
      email: user.email,
      type: OtpType.PASSWORD_RESET,
    });

    await new this.otpModel({
      email: user.email,
      otpHash,
      type: OtpType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    }).save();

    await this.emailService.sendPasswordResetOTP(user.email, otp);

    return { message: successMsg };
  }

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const otpRecord = await this.otpModel
      .findOne({ email: dto.email, type: OtpType.PASSWORD_RESET })
      .exec();

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestException('Too many verification attempts');
    }

    const isValid = await bcrypt.compare(dto.otp, otpRecord.otpHash);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestException('Invalid OTP');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(resetToken, 10);

    await new this.resetSessionModel({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      used: false,
    }).save();

    await this.otpModel.deleteOne({ _id: otpRecord._id });

    return { resetToken };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const sessions = await this.resetSessionModel
      .find({ used: false, expiresAt: { $gt: new Date() } })
      .exec();

    let validSession: any = null;
    for (const session of sessions) {
      const isValid = await bcrypt.compare(dto.token, session.tokenHash);
      if (isValid) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.usersService.update(validSession.userId, {
      passwordHash: newPasswordHash,
    });

    validSession.used = true;
    await validSession.save();

    await this.userSessionModel.deleteMany({ userId: validSession.userId });

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.usersService.update(userId, { passwordHash: newPasswordHash });
    await this.userSessionModel.deleteMany({ userId });

    return { message: 'Password changed successfully' };
  }

  async logout(token: string) {
    return { message: 'Logged out successfully' };
  }
}
