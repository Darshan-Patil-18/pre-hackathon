import os
import json
import time
import re
from typing import Dict, Any, Optional, Tuple
import requests
from dotenv import dotenv_values

# Load exact environment variables
env_vars = dotenv_values('.env')
GROQ_API_KEY = env_vars.get('GROQ_API_KEY') or os.environ.get('GROQ_API_KEY', '')
OPEN_ROUTER_API_KEY = env_vars.get('OPEN_ROUTER_API_KEY') or os.environ.get('OPEN_ROUTER_API_KEY', '')

# Load models configuration
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'models.config')
def load_config() -> Dict[str, Any]:
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {
            "app_name": "BrandMind",
            "stages": {
                "stage1_interview": {"primary": {"provider": "groq", "model": "qwen/qwen3.8-27b"}, "fallback": {"provider": "openrouter", "model": "openrouter/free"}},
                "stage2_position": {"primary": {"provider": "groq", "model": "openai/gpt-oss-120b"}, "fallback": {"provider": "openrouter", "model": "openrouter/free"}},
                "stage3_personality": {"primary": {"provider": "groq", "model": "qwen/qwen3.8-27b"}, "fallback": {"provider": "openrouter", "model": "openrouter/free"}},
                "stage4_antigeneric": {"primary": {"provider": "groq", "model": "qwen/qwen3.8-27b"}, "fallback": {"provider": "openrouter", "model": "openrouter/free"}},
                "stage5_naming": {"primary": {"provider": "groq", "model": "openai/gpt-oss-120b"}, "fallback": {"provider": "openrouter", "model": "openrouter/free"}},
                "stage6_visuals": {"primary": {"provider": "groq", "model": "qwen/qwen3.8-27b"}, "fallback": {"provider": "openrouter", "model": "openrouter/free"}},
                "stage7_consistency": {"primary": {"provider": "groq", "model": "openai/gpt-oss-120b"}, "fallback": {"provider": "openrouter", "model": "openrouter/free"}},
                "stage8_launchkit": {"primary": {"provider": "groq", "model": "qwen/qwen3.8-27b"}, "fallback": {"provider": "openrouter", "model": "openrouter/free"}}
            }
        }

CONFIG = load_config()

# Simple in-memory rate limiter per IP
# records timestamp of calls
RATE_LIMIT_STORE: Dict[str, list] = {}

def check_rate_limit(ip: str) -> Tuple[bool, str]:
    now = time.time()
    if ip not in RATE_LIMIT_STORE:
        RATE_LIMIT_STORE[ip] = []
    
    # Keep last 1 hour
    RATE_LIMIT_STORE[ip] = [t for t in RATE_LIMIT_STORE[ip] if now - t < 3600]
    
    limit_per_hour = CONFIG.get("rate_limits", {}).get("runs_per_hour_per_ip", 20)
    if len(RATE_LIMIT_STORE[ip]) >= limit_per_hour * 8: # allowance for multi-stage requests
        return False, "Rate limit reached for your session (designed for free API tier fairness). Please try again in an hour."
    
    RATE_LIMIT_STORE[ip].append(now)
    return True, ""


def clean_json_text(text: str) -> str:
    """Extract and sanitize JSON from model output."""
    if not text:
        return "{}"
    text = text.strip()
    
    # Remove markdown code fences if present
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if match:
            text = match.group(1).strip()
    
    # Try finding the first '{' and last '}'
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]
    
    # Fix trailing commas before } or ]
    text = re.sub(r',\s*([}\]])', r'\1', text)
    return text


def parse_and_validate_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """Parse text into dict, attempting lenient repair if needed."""
    cleaned = clean_json_text(raw_text)
    try:
        return json.loads(cleaned)
    except Exception:
        # Secondary repair: replace unescaped newlines in strings
        try:
            repaired = re.sub(r'([^\\])\n', r'\1\\n', cleaned)
            return json.loads(repaired)
        except Exception:
            return None


def execute_llm_request(provider: str, model: str, messages: list, temperature: float = 0.4, timeout: int = 22) -> Tuple[bool, str, float]:
    """Execute raw chat completion against specified provider with latency tracking."""
    start_time = time.time()
    
    if provider == "groq":
        if not GROQ_API_KEY:
            return False, "Groq API key not configured.", 0.0
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        body = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 1600,
            "response_format": {"type": "json_object"}
        }
    elif provider == "openrouter":
        if not OPEN_ROUTER_API_KEY:
            return False, "OpenRouter API key not configured.", 0.0
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPEN_ROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://brandmind.hackathon",
            "X-Title": "BrandMind"
        }
        body = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 1600
        }
    else:
        return False, f"Unknown provider: {provider}", 0.0

    try:
        resp = requests.post(url, headers=headers, json=body, timeout=timeout)
        latency = round((time.time() - start_time) * 1000, 1)
        if resp.status_code == 200:
            content = resp.json()['choices'][0]['message']['content']
            return True, content, latency
        else:
            err_msg = f"HTTP {resp.status_code}: {resp.text[:150]}"
            return False, err_msg, latency
    except requests.exceptions.Timeout:
        latency = round((time.time() - start_time) * 1000, 1)
        return False, f"Timeout after {timeout}s", latency
    except Exception as e:
        latency = round((time.time() - start_time) * 1000, 1)
        return False, str(e), latency


def call_stage_with_fallback(stage_key: str, system_prompt: str, user_prompt: str, temperature: float = 0.4) -> Dict[str, Any]:
    """
    Executes a stage using the strict reliability chain:
    1. Primary model (with 1 retry)
    2. Fallback model on alternate provider (with 1 retry)
    3. Last resort openrouter/free
    4. Throws structured exception if all fail
    """
    stage_cfg = CONFIG.get("stages", {}).get(stage_key, {})
    primary = stage_cfg.get("primary", {"provider": "groq", "model": "qwen/qwen3.8-27b"})
    fallback = stage_cfg.get("fallback", {"provider": "openrouter", "model": "openrouter/free"})
    
    messages = [
        {"role": "system", "content": system_prompt + "\n\nCRITICAL: Respond ONLY with valid, parseable JSON matching the requested schema. No surrounding conversation or markdown outside JSON."},
        {"role": "user", "content": user_prompt}
    ]

    attempts_log = []
    
    # 1. Primary Model (up to 2 attempts)
    for attempt in range(2):
        success, raw, latency = execute_llm_request(primary["provider"], primary["model"], messages, temperature=temperature)
        attempts_log.append({"provider": primary["provider"], "model": primary["model"], "success": success, "latency_ms": latency})
        if success:
            parsed = parse_and_validate_json(raw)
            if parsed is not None:
                return {
                    "data": parsed,
                    "meta": {
                        "stage": stage_key,
                        "provider": primary["provider"],
                        "model": primary["model"],
                        "latency_ms": latency,
                        "attempts": attempts_log
                    }
                }
        time.sleep(0.5)

    # 2. Fallback Model (up to 2 attempts)
    for attempt in range(2):
        success, raw, latency = execute_llm_request(fallback["provider"], fallback["model"], messages, temperature=temperature)
        attempts_log.append({"provider": fallback["provider"], "model": fallback["model"], "success": success, "latency_ms": latency})
        if success:
            parsed = parse_and_validate_json(raw)
            if parsed is not None:
                return {
                    "data": parsed,
                    "meta": {
                        "stage": stage_key,
                        "provider": fallback["provider"],
                        "model": fallback["model"],
                        "latency_ms": latency,
                        "attempts": attempts_log,
                        "used_fallback": True
                    }
                }
        time.sleep(0.5)

    # 3. Emergency Last-Resort: openrouter/free router
    if fallback["model"] != "openrouter/free":
        success, raw, latency = execute_llm_request("openrouter", "openrouter/free", messages, temperature=temperature)
        attempts_log.append({"provider": "openrouter", "model": "openrouter/free", "success": success, "latency_ms": latency})
        if success:
            parsed = parse_and_validate_json(raw)
            if parsed is not None:
                return {
                    "data": parsed,
                    "meta": {
                        "stage": stage_key,
                        "provider": "openrouter",
                        "model": "openrouter/free",
                        "latency_ms": latency,
                        "attempts": attempts_log,
                        "used_fallback": True
                    }
                }

    raise RuntimeError(f"All model providers failed or returned invalid JSON for stage '{stage_key}'. Attempts: {attempts_log}")
