import json
import os
import glob
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def export_chat():
    doc = Document()
    
    # Title
    title = doc.add_heading('Music Player Project - Chat History & Troubleshooting Log', level=0)
    
    # Add summary section
    p = doc.add_paragraph()
    p.add_run("Date: ").bold = True
    p.add_run("2026-09-18\n")
    p.add_run("Project: ").bold = True
    p.add_run("Warrior69-ops / Music Player (Next.js + NestJS + youtubei.js)\n")
    p.add_run("Issue Resolved: ").bold = True
    p.add_run("AxiosError: Network Error on startup and login.\n")

    doc.add_heading('Root Cause Analysis & Fixes', level=1)
    
    p2 = doc.add_paragraph()
    p2.add_run("1. Startup Race Condition:\n").bold = True
    p2.add_run("The Next.js frontend (apps/web) compiles in ~8 seconds, while the NestJS backend (apps/api) with TypeScript watch mode takes ~80 seconds to fully build and bind to port 3001. When opening the browser before the backend was listening, Axios received connection refused and threw AxiosError: Network Error.\n\n")
    
    p2.add_run("2. CORS and Host Binding Configuration:\n").bold = True
    p2.add_run("The NestJS server was updated in apps/api/src/main.ts to explicitly allow credentials, all required cross-origin headers, methods, and dual-stack IPv4/IPv6 host binding ('0.0.0.0').\n\n")

    p2.add_run("3. Frontend Auto-Retry Interceptor:\n").bold = True
    p2.add_run("Added an automatic retry interceptor in apps/web/src/lib/api.ts with exponential backoff for transient network errors so initial startup lags never crash the UI.\n\n")

    p2.add_run("4. User Credentials & Error Messaging:\n").bold = True
    p2.add_run("The user account in MongoDB is 'vedchatwani1@gmail.com' (with 'a'). Improved error toast extraction in login/register pages to clearly display 'Invalid credentials' rather than generic failure fallback.\n\n")

    p2.add_run("5. Audio Streaming Architecture:\n").bold = True
    p2.add_run("Maintained pure youtubei.js integration without any yt-dlp dependencies as strictly requested.\n")

    doc.add_heading('Conversation Messages', level=1)

    # Search for transcript files
    transcript_files = glob.glob(r"C:\Users\VED\.gemini\antigravity-ide\brain\*\.system_generated\logs\transcript.jsonl")
    
    for tf in transcript_files:
        try:
            with open(tf, 'r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        step_type = data.get('type')
                        content = data.get('content', '')
                        
                        if step_type == 'USER_INPUT' and content:
                            p_user = doc.add_paragraph()
                            run_u = p_user.add_run(f"User: ")
                            run_u.bold = True
                            run_u.font.color.rgb = RGBColor(0, 102, 204)
                            p_user.add_run(str(content)[:2000])
                        elif step_type == 'PLANNER_RESPONSE' and content:
                            p_bot = doc.add_paragraph()
                            run_b = p_bot.add_run(f"Assistant: ")
                            run_b.bold = True
                            run_b.font.color.rgb = RGBColor(0, 153, 76)
                            p_bot.add_run(str(content)[:2000])
                    except Exception:
                        pass
        except Exception as e:
            print(f"Error reading transcript: {e}")

    out_path = r"c:\Users\VED\OneDrive\Desktop\music-player\Chat_History.docx"
    doc.save(out_path)
    print(f"Saved chat history to {out_path}")

if __name__ == '__main__':
    export_chat()
