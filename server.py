import os
import re
import uuid
import time
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import database
import llm_client
import prompts

app = FastAPI(title="BrandMind API", version="1.0.0")

# CORS middleware for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def sanitize_svg(svg_code: str) -> str:
    """Sanitize SVG output: prevent XSS, strip scripts, links, event handlers."""
    if not svg_code:
        return ""
    # Remove script tags
    svg_code = re.sub(r'<\s*script[^>]*>[\s\S]*?<\s*/\s*script\s*>', '', svg_code, flags=re.IGNORECASE)
    # Remove inline event handlers
    svg_code = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', '', svg_code, flags=re.IGNORECASE)
    # Remove javascript: uris
    svg_code = re.sub(r'href\s*=\s*["\']javascript:[^"\']*["\']', '', svg_code, flags=re.IGNORECASE)
    # Remove foreignObject
    svg_code = re.sub(r'<\s*foreignObject[^>]*>[\s\S]*?<\s*/\s*foreignObject\s*>', '', svg_code, flags=re.IGNORECASE)
    return svg_code.strip()

# --- Request Models ---
class StartSessionRequest(BaseModel):
    idea: str = Field(..., max_length=1500)

class Stage1ConfirmRequest(BaseModel):
    answers: Optional[Dict[str, str]] = None
    edited_summary: Optional[str] = None
    edited_target_user: Optional[str] = None

class Stage2SelectRequest(BaseModel):
    selected_id: str
    custom_feedback: Optional[str] = None

class RegenerateStageRequest(BaseModel):
    stage_key: str
    tone_guidance: Optional[str] = None

class AudienceShiftRequest(BaseModel):
    new_audience: str = Field(..., max_length=500)

class UpdateFieldRequest(BaseModel):
    stage_key: str
    field_name: str
    value: Any

class PublishKitRequest(BaseModel):
    brand_name: Optional[str] = None
    tagline: Optional[str] = None

# --- API Endpoints ---

@app.get("/api/system/status")
def system_status():
    config = llm_client.CONFIG
    return {
        "app_name": config.get("app_name", "BrandMind"),
        "tagline": config.get("app_tagline", "AI brand intelligence that can think."),
        "status": "healthy",
        "has_groq_key": bool(llm_client.GROQ_API_KEY),
        "has_openrouter_key": bool(llm_client.OPEN_ROUTER_API_KEY),
        "stages": config.get("stages", {})
    }

@app.post("/api/sessions/start")
def start_session(req: StartSessionRequest, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)
    
    session_id = f"bm_{uuid.uuid4().hex[:12]}"
    initial_profile = {
        "idea": req.idea.strip()
    }
    initial_telemetry: List[Dict[str, Any]] = []
    
    database.save_session(session_id, req.idea.strip(), 1, initial_profile, initial_telemetry)
    return {
        "session_id": session_id,
        "current_stage": 1,
        "profile": initial_profile,
        "telemetry": initial_telemetry
    }

@app.get("/api/sessions/{session_id}")
def get_session(session_id: str):
    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess

@app.post("/api/sessions/{session_id}/stage1_interview")
def run_stage1(session_id: str, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_prompt, user_prompt = prompts.get_stage1_prompt(sess["idea"])
    try:
        result = llm_client.call_stage_with_fallback("stage1_interview", sys_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    profile = sess["profile"]
    profile["stage1_interview"] = result["data"]
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], 1, profile, telemetry)
    return {
        "stage": 1,
        "stage_data": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/stage1_confirm")
def confirm_stage1(session_id: str, req: Stage1ConfirmRequest):
    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    profile = sess["profile"]
    if "stage1_interview" not in profile:
        raise HTTPException(status_code=400, detail="Stage 1 interview has not been conducted yet")

    st1 = profile["stage1_interview"]
    if req.answers:
        st1["founder_answers"] = req.answers
    if req.edited_summary:
        st1["understanding_summary"] = req.edited_summary
    if req.edited_target_user:
        st1["target_user"] = req.edited_target_user

    profile["stage1_interview"] = st1
    database.save_session(session_id, sess["idea"], 2, profile, sess["telemetry"])
    return {"status": "confirmed", "profile": profile}

@app.post("/api/sessions/{session_id}/stage2_position")
def run_stage2(session_id: str, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_prompt, user_prompt = prompts.get_stage2_prompt(sess["profile"])
    try:
        result = llm_client.call_stage_with_fallback("stage2_position", sys_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    profile = sess["profile"]
    profile["stage2_position"] = result["data"]
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], 2, profile, telemetry)
    return {
        "stage": 2,
        "stage_data": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/stage2_select")
def select_stage2_direction(session_id: str, req: Stage2SelectRequest):
    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    profile = sess["profile"]
    st2 = profile.get("stage2_position", {})
    dirs = st2.get("directions", [])
    
    selected_dir = next((d for d in dirs if d["id"] == req.selected_id), None)
    if not selected_dir and dirs:
        selected_dir = dirs[0]
    
    st2["selected_direction_id"] = req.selected_id
    st2["selected_direction"] = selected_dir
    if req.custom_feedback:
        st2["founder_direction_guidance"] = req.custom_feedback

    profile["stage2_position"] = st2
    database.save_session(session_id, sess["idea"], 3, profile, sess["telemetry"])
    return {"status": "selected", "profile": profile}

@app.post("/api/sessions/{session_id}/stage3_personality")
def run_stage3(session_id: str, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_prompt, user_prompt = prompts.get_stage3_prompt(sess["profile"])
    try:
        result = llm_client.call_stage_with_fallback("stage3_personality", sys_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    profile = sess["profile"]
    profile["stage3_personality"] = result["data"]
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], 3, profile, telemetry)
    return {
        "stage": 3,
        "stage_data": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/stage4_antigeneric")
def run_stage4(session_id: str, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_prompt, user_prompt = prompts.get_stage4_prompt(sess["profile"])
    try:
        result = llm_client.call_stage_with_fallback("stage4_antigeneric", sys_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    profile = sess["profile"]
    profile["stage4_antigeneric"] = result["data"]
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], 4, profile, telemetry)
    return {
        "stage": 4,
        "stage_data": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/stage5_naming")
def run_stage5(session_id: str, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_prompt, user_prompt = prompts.get_stage5_prompt(sess["profile"])
    try:
        result = llm_client.call_stage_with_fallback("stage5_naming", sys_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    profile = sess["profile"]
    profile["stage5_naming"] = result["data"]
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], 5, profile, telemetry)
    return {
        "stage": 5,
        "stage_data": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/stage6_visuals")
def run_stage6(session_id: str, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_prompt, user_prompt = prompts.get_stage6_prompt(sess["profile"])
    try:
        result = llm_client.call_stage_with_fallback("stage6_visuals", sys_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    data = result["data"]
    # Enforce SVG sanitization
    if "logo_concept" in data and "svg_code" in data["logo_concept"]:
        data["logo_concept"]["svg_code"] = sanitize_svg(data["logo_concept"]["svg_code"])

    profile = sess["profile"]
    profile["stage6_visuals"] = data
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], 6, profile, telemetry)
    return {
        "stage": 6,
        "stage_data": data,
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/stage7_consistency")
def run_stage7(session_id: str, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_prompt, user_prompt = prompts.get_stage7_prompt(sess["profile"])
    try:
        result = llm_client.call_stage_with_fallback("stage7_consistency", sys_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    profile = sess["profile"]
    profile["stage7_consistency"] = result["data"]
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], 7, profile, telemetry)
    return {
        "stage": 7,
        "stage_data": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/stage8_launchkit")
def run_stage8(session_id: str, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_prompt, user_prompt = prompts.get_stage8_prompt(sess["profile"])
    try:
        result = llm_client.call_stage_with_fallback("stage8_launchkit", sys_prompt, user_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    profile = sess["profile"]
    profile["stage8_launchkit"] = result["data"]
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], 8, profile, telemetry)
    return {
        "stage": 8,
        "stage_data": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

# --- Human Controls & Extras ---

@app.post("/api/sessions/{session_id}/regenerate_stage")
def regenerate_stage(session_id: str, req: RegenerateStageRequest, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    profile = sess["profile"]
    stage_key = req.stage_key
    guidance = req.tone_guidance or ""

    if stage_key == "stage1_interview":
        sys_p, user_p = prompts.get_stage1_prompt(sess["idea"])
    elif stage_key == "stage2_position":
        sys_p, user_p = prompts.get_stage2_prompt(profile, guidance)
    elif stage_key == "stage3_personality":
        sys_p, user_p = prompts.get_stage3_prompt(profile, guidance)
    elif stage_key == "stage4_antigeneric":
        sys_p, user_p = prompts.get_stage4_prompt(profile)
    elif stage_key == "stage5_naming":
        sys_p, user_p = prompts.get_stage5_prompt(profile, guidance)
    elif stage_key == "stage6_visuals":
        sys_p, user_p = prompts.get_stage6_prompt(profile)
    elif stage_key == "stage7_consistency":
        sys_p, user_p = prompts.get_stage7_prompt(profile)
    elif stage_key == "stage8_launchkit":
        sys_p, user_p = prompts.get_stage8_prompt(profile)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown stage: {stage_key}")

    try:
        result = llm_client.call_stage_with_fallback(stage_key, sys_p, user_p, temperature=0.6)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    if stage_key == "stage6_visuals" and "logo_concept" in result["data"]:
        result["data"]["logo_concept"]["svg_code"] = sanitize_svg(result["data"]["logo_concept"].get("svg_code", ""))

    profile[stage_key] = result["data"]
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], sess["current_stage"], profile, telemetry)
    return {
        "stage_key": stage_key,
        "stage_data": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/audience_shift")
def audience_shift(session_id: str, req: AudienceShiftRequest, request: Request):
    ip = get_client_ip(request)
    allowed, msg = llm_client.check_rate_limit(ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sys_p, user_p = prompts.get_audience_shift_prompt(sess["profile"], req.new_audience)
    try:
        result = llm_client.call_stage_with_fallback("stage2_position", sys_p, user_p, temperature=0.5)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    profile = sess["profile"]
    profile["audience_shift"] = result["data"]
    
    telemetry = sess["telemetry"]
    telemetry.append(result["meta"])

    database.save_session(session_id, sess["idea"], sess["current_stage"], profile, telemetry)
    return {
        "audience_shift": result["data"],
        "meta": result["meta"],
        "profile": profile
    }

@app.post("/api/sessions/{session_id}/update_field")
def update_field(session_id: str, req: UpdateFieldRequest):
    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    profile = sess["profile"]
    if req.stage_key not in profile:
        profile[req.stage_key] = {}
    
    profile[req.stage_key][req.field_name] = req.value
    database.save_session(session_id, sess["idea"], sess["current_stage"], profile, sess["telemetry"])
    return {"status": "updated", "profile": profile}

@app.post("/api/sessions/{session_id}/publish_kit")
def publish_kit(session_id: str, req: PublishKitRequest):
    sess = database.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    kit_id = f"kit_{uuid.uuid4().hex[:8]}"
    profile = sess["profile"]
    
    brand_name = req.brand_name or profile.get("stage5_naming", {}).get("primary_name", "Brand")
    tagline = req.tagline or profile.get("stage5_naming", {}).get("tagline", "")
    
    full_kit = {
        "profile": profile,
        "telemetry": sess["telemetry"],
        "published_at": time.time()
    }

    database.save_kit(kit_id, session_id, brand_name, tagline, full_kit)
    return {"kit_id": kit_id, "share_url": f"/kit/{kit_id}"}

@app.get("/api/kits/{kit_id}")
def get_public_kit(kit_id: str):
    kit = database.get_kit(kit_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    return kit

# --- Static Frontend Serving & SPA Catch-all ---
DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Ignore /api paths (they should 404 if not matched)
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        target_file = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting BrandMind server on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=180, timeout_graceful_shutdown=30)
