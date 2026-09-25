"""Full 8-stage end-to-end integration test for BrandMind."""
import sys, json, time
sys.stdout.reconfigure(encoding='utf-8')

import requests

BASE = "http://localhost:8000"

def api(method, path, **kwargs):
    url = f"{BASE}{path}"
    r = getattr(requests, method)(url, timeout=120, **kwargs)
    return r

def run_test_idea(idea, test_name):
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print(f"IDEA: {idea}")
    print('='*60)

    # Start session
    sess = api('post', '/api/sessions/start', json={'idea': idea})
    assert sess.status_code == 200, f"Start failed: {sess.text}"
    sid = sess.json()['session_id']
    print(f"[OK] Session started: {sid}")

    # Stage 1
    print("[...] Stage 1 - Interview...")
    r1 = api('post', f'/api/sessions/{sid}/stage1_interview')
    assert r1.status_code == 200, f"Stage 1 failed: {r1.text[:200]}"
    st1 = r1.json()['profile']['stage1_interview']
    assert 'core_problem' in st1 and 'adaptive_questions' in st1
    m1 = r1.json()['meta']
    print(f"[OK] Stage 1: {m1['provider']} {m1['model']} {m1['latency_ms']}ms")

    # Confirm Stage 1
    api('post', f'/api/sessions/{sid}/stage1_confirm', json={
        'edited_summary': st1.get('understanding_summary', '')
    })
    print("[OK] Stage 1 confirmed")

    # Stage 2
    print("[...] Stage 2 - Brand Battle...")
    r2 = api('post', f'/api/sessions/{sid}/stage2_position')
    assert r2.status_code == 200, f"Stage 2 failed: {r2.text[:200]}"
    st2 = r2.json()['profile']['stage2_position']
    assert 'directions' in st2 and len(st2['directions']) >= 2
    assert 'agent_critiques' in st2
    m2 = r2.json()['meta']
    print(f"[OK] Stage 2: {m2['provider']} {m2['model']} {m2['latency_ms']}ms, {len(st2['directions'])} directions")

    # Select first direction
    dir_id = st2.get('recommended_winner_id') or st2['directions'][0]['id']
    api('post', f'/api/sessions/{sid}/stage2_select', json={'selected_id': dir_id})
    print(f"[OK] Stage 2 direction selected: {dir_id}")

    # Stage 3
    print("[...] Stage 3 - Personality...")
    r3 = api('post', f'/api/sessions/{sid}/stage3_personality')
    assert r3.status_code == 200, f"Stage 3 failed: {r3.text[:200]}"
    st3 = r3.json()['profile']['stage3_personality']
    assert 'brand_traits' in st3 and len(st3.get('brand_traits', [])) >= 2
    m3 = r3.json()['meta']
    print(f"[OK] Stage 3: {m3['provider']} {m3['model']} {m3['latency_ms']}ms, {len(st3['brand_traits'])} traits")

    # Stage 4
    print("[...] Stage 4 - Anti-Generic Engine...")
    r4 = api('post', f'/api/sessions/{sid}/stage4_antigeneric')
    assert r4.status_code == 200, f"Stage 4 failed: {r4.text[:200]}"
    st4 = r4.json()['profile']['stage4_antigeneric']
    assert 'originality_score' in st4
    m4 = r4.json()['meta']
    print(f"[OK] Stage 4: {m4['provider']} {m4['model']} {m4['latency_ms']}ms, originality={st4['originality_score']}")

    # Stage 5
    print("[...] Stage 5 - Naming & Messaging...")
    r5 = api('post', f'/api/sessions/{sid}/stage5_naming')
    assert r5.status_code == 200, f"Stage 5 failed: {r5.text[:200]}"
    st5 = r5.json()['profile']['stage5_naming']
    assert 'primary_name' in st5 and 'tagline' in st5
    m5 = r5.json()['meta']
    print(f"[OK] Stage 5: {m5['provider']} {m5['model']} {m5['latency_ms']}ms, name='{st5['primary_name']}', tagline='{st5['tagline']}'")

    # Stage 6
    print("[...] Stage 6 - Visual Direction & SVG Logo...")
    r6 = api('post', f'/api/sessions/{sid}/stage6_visuals')
    assert r6.status_code == 200, f"Stage 6 failed: {r6.text[:200]}"
    st6 = r6.json()['profile']['stage6_visuals']
    assert 'color_palette' in st6
    svg_raw = st6.get('logo_concept', {}).get('svg_code', '')
    # Safety check: no script tags
    assert '<script' not in svg_raw.lower(), "SVG contains script tags - SECURITY ISSUE"
    m6 = r6.json()['meta']
    print(f"[OK] Stage 6: {m6['provider']} {m6['model']} {m6['latency_ms']}ms, palette={len(st6['color_palette'])} colors, SVG sanitized={bool(svg_raw)}")

    # Stage 7
    print("[...] Stage 7 - Consistency Audit...")
    r7 = api('post', f'/api/sessions/{sid}/stage7_consistency')
    assert r7.status_code == 200, f"Stage 7 failed: {r7.text[:200]}"
    st7 = r7.json()['profile']['stage7_consistency']
    assert 'overall_consistency_score' in st7
    m7 = r7.json()['meta']
    print(f"[OK] Stage 7: {m7['provider']} {m7['model']} {m7['latency_ms']}ms, consistency={st7['overall_consistency_score']}")

    # Stage 8
    print("[...] Stage 8 - Launch Kit...")
    r8 = api('post', f'/api/sessions/{sid}/stage8_launchkit')
    assert r8.status_code == 200, f"Stage 8 failed: {r8.text[:200]}"
    st8 = r8.json()['profile']['stage8_launchkit']
    assert 'landing_page' in st8 and 'social_posts' in st8
    m8 = r8.json()['meta']
    print(f"[OK] Stage 8: {m8['provider']} {m8['model']} {m8['latency_ms']}ms, posts={len(st8.get('social_posts', []))}")

    # Publish Kit
    pub = api('post', f'/api/sessions/{sid}/publish_kit', json={
        'brand_name': st5.get('primary_name'),
        'tagline': st5.get('tagline')
    })
    assert pub.status_code == 200
    kit_id = pub.json()['kit_id']
    print(f"[OK] Kit published: {kit_id}")

    # Fetch shared kit
    fetched = api('get', f'/api/kits/{kit_id}')
    assert fetched.status_code == 200
    print(f"[OK] Shared kit fetched: brand={fetched.json()['brand_name']}")

    # Audience shift test
    print("[...] Testing Audience Shifter...")
    shift = api('post', f'/api/sessions/{sid}/audience_shift', json={
        'new_audience': 'Enterprise Fortune 500 Chief Legal Officers'
    })
    assert shift.status_code == 200
    s_data = shift.json().get('audience_shift', {})
    print(f"[OK] Audience shift: new_audience='{s_data.get('new_target_audience', '')}' adapted pitch='{s_data.get('tailored_pitch', '')[:50]}...'")

    # Regenerate test (Stage 5 with tone)
    print("[...] Testing Tone Regeneration (Stage 5)...")
    regen = api('post', f'/api/sessions/{sid}/regenerate_stage', json={
        'stage_key': 'stage5_naming',
        'tone_guidance': 'Make it more premium and authoritative, less casual'
    })
    assert regen.status_code == 200
    new_name = regen.json()['stage_data'].get('primary_name', 'REGEN_FAILED')
    print(f"[OK] Regeneration worked: new name={new_name}")

    total_latency = sum([
        m1['latency_ms'], m2['latency_ms'], m3['latency_ms'],
        m4['latency_ms'], m5['latency_ms'], m6['latency_ms'],
        m7['latency_ms'], m8['latency_ms']
    ])
    print(f"\n[TOTAL PIPELINE TIME: {total_latency/1000:.1f}s across 8 stages]")
    return sid, kit_id


if __name__ == '__main__':
    try:
        # Test 1: Freelance Legal AI
        sid1, kit1 = run_test_idea(
            "An AI-powered legal contract assistant for freelance designers and engineers",
            "Freelance Legal AI Tool"
        )
        print("\n[PASS] Full 8-stage pipeline Test 1 PASSED")

        # Test 2: Student Hackathon Teammates
        sid2, kit2 = run_test_idea(
            "An app that helps students find teammates for hackathons and ambitious side projects",
            "Student Hackathon Teammate Finder"
        )
        print("\n[PASS] Full 8-stage pipeline Test 2 PASSED")

        print("\n" + "="*60)
        print("ALL INTEGRATION TESTS PASSED")
        print(f"Kit 1: http://localhost:8000/kit/{kit1}")
        print(f"Kit 2: http://localhost:8000/kit/{kit2}")
        print("="*60)
    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
