"""End-to-end check of the demo against the Phase 1 success criteria.
Run: npx vite preview --port 4173 & PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/e2e.py
"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:4173/"
SHOTS = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "test-shots"); SHOTS.mkdir(exist_ok=True)
results = []

def ok(name, cond=True):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # Citizen on a phone, location permission NOT granted (denied).
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, permissions=[])
        pg = await ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))

        await pg.goto(BASE); await pg.wait_for_selector("text=तपाईंको आवाज महत्त्वपूर्ण छ।")
        ok("Home opens in Nepali by default")
        await pg.screenshot(path=str(SHOTS / "01-home.png"), full_page=True)

        await pg.get_by_role("button", name="EN").click()
        ok("Switch to English", await pg.get_by_text("Your voice matters.").is_visible())
        await pg.get_by_role("button", name="मैथिली").click()
        ok("Switch to Maithili", await pg.get_by_text("अहाँक आवाज महत्त्वपूर्ण अछि।").is_visible())
        await pg.get_by_role("button", name="नेपाली").click()

        # Quick report via the Road tile
        await pg.get_by_role("link", name="सडक").click()
        await pg.wait_for_selector("text=के भयो?")
        ok("Category tile pre-selects Road", await pg.get_by_role("button", name="सडक", pressed=True).count() == 1)
        text = "लहान बजार नजिक सडकमा ठूलो खाल्डो छ।"
        await pg.fill("#what", text)
        # Language switch on the form itself must not lose input
        await pg.get_by_role("button", name="मैथिली").click()
        ok("Typed text survives switch to Maithili", await pg.input_value("#what") == text and await pg.get_by_text("की भेल?").is_visible())
        await pg.get_by_role("button", name="EN").click()
        ok("Typed text survives switch to English", await pg.input_value("#what") == text)
        await pg.reload(); await pg.wait_for_selector("#what")
        ok("Typed text survives a page reload (draft saved)", await pg.input_value("#what") == text)
        ok("Form labels now English", await pg.get_by_text("What happened?").is_visible())

        # Submitting without consent shows an error, not a crash
        await pg.get_by_role("button", name="Send report").click()
        ok("Validation: consent required", await pg.get_by_text("Please agree to continue").first.is_visible())

        # Location: GPS denied must not block
        await pg.get_by_role("link", name="Add location").click()
        await pg.get_by_role("button", name="Use my current location").click()
        await pg.wait_for_timeout(800)
        ok("GPS denied shows friendly message", await pg.get_by_text("Location permission denied").is_visible() or await pg.get_by_text("Couldn't find your location").is_visible())
        await pg.get_by_role("tab", name="Choose myself").click()
        await pg.get_by_label("Province").select_option("madhesh")
        await pg.get_by_label("District").select_option("siraha")
        await pg.get_by_label("Local level").select_option("siraha:lahan-municipality")
        await pg.get_by_label("Ward no.").select_option("5")
        await pg.screenshot(path=str(SHOTS / "03-location.png"), full_page=True)
        await pg.get_by_role("button", name="Confirm this location").click()
        ok("Manual location saved", await pg.get_by_text("Lahan Municipality").is_visible())

        await pg.get_by_label("The information I gave").check()
        await pg.screenshot(path=str(SHOTS / "02-report.png"), full_page=True)
        await pg.get_by_role("button", name="Send report").click()
        await pg.wait_for_selector("text=Report received")
        ref = (await pg.locator(".mono").first.inner_text()).strip()
        ok(f"Anonymous submission creates BS-year reference ({ref})", ref.startswith("HTP-208") and len(ref) == 15)
        link = await pg.locator(".panel-ink .mono").first.inner_text()
        token = link.rsplit("/", 1)[-1]
        await pg.screenshot(path=str(SHOTS / "04-done.png"), full_page=True)

        # Tracking with wrong token fails; right token shows only 3 statuses
        await pg.goto(BASE + f"#/track/{ref}/wrongtoken")
        await pg.wait_for_timeout(400)
        ok("Wrong token is rejected", await pg.get_by_text("didn't match").is_visible())
        await pg.goto(BASE + "#/"); await pg.goto(BASE + f"#/track/{ref}/{token}")
        await pg.wait_for_selector("text=Your report has arrived.")
        body = await pg.inner_text("main")
        ok("Tracking shows status only, no staff names or notes", "reporter" not in body and "admin" not in body.lower())

        # Explore (public archive)
        await pg.goto(BASE + "#/explore"); await pg.wait_for_selector(".article")
        ok("Public archive lists only approved reports", await pg.locator(".article").count() == 3)
        await pg.screenshot(path=str(SHOTS / "05-explore.png"), full_page=True)

        # ── Staff: Admin Head ──
        sctx = await b.new_context(viewport={"width": 1440, "height": 900})
        s = await sctx.new_page()
        s.on("pageerror", lambda e: errors.append(str(e)))
        await s.goto(BASE + "#/staff")
        ok("Admin Head login", True)
        await s.fill("input[autocomplete=username]", "admin.head"); await s.fill("input[type=password]", "demo1234")
        await s.get_by_role("button", name="Sign in").click()
        await s.wait_for_selector("text=Urgent, unscreened")
        await s.screenshot(path=str(SHOTS / "06-inbox.png"))
        # Note: staff demo data is per-browser, so the citizen's report lives in the other context.
        ok("Inbox shows urgent sample report first", "URGENT" in await s.locator("tbody tr").first.inner_text())
        await s.locator("tbody tr").first.click()
        await s.wait_for_selector("text=Internal notes and activity")
        await s.get_by_role("combobox", name="Move to state").select_option("screening")
        await s.wait_for_timeout(200)
        await s.get_by_role("button", name="Assign reporter").click()
        await s.get_by_label("ram.reporter").check()
        await s.get_by_role("button", name="Save assignment").click()
        ok("Admin Head assigns a reporter", await s.get_by_text("Assignment saved").is_visible())
        await s.get_by_role("button", name="Request info from citizen").click()
        await s.locator(".modal textarea").fill("Which tole is affected?")
        await s.get_by_role("button", name="Send request").click()
        await s.get_by_role("button", name="Draft public summary").click()
        await s.locator(".modal input").first.fill("राजविराजमा तटबन्ध काटिने खतरा")
        await s.locator(".modal textarea").fill("नागरिक रिपोर्टपछि HTP खबरले स्थिति अनुगमन गरिरहेको छ।")
        await s.get_by_role("button", name="Save draft").click()
        await s.get_by_role("button", name="Approve and publish").click()
        ok("Admin Head publishes after approval", await s.get_by_text("Published to the public archive").is_visible())
        await s.screenshot(path=str(SHOTS / "07-detail.png"), full_page=True)
        await s.get_by_role("button", name="Sign out").click()

        # ── Staff: Admin cannot assign or publish ──
        await s.fill("input[autocomplete=username]", "admin"); await s.fill("input[type=password]", "demo1234")
        await s.get_by_role("button", name="Sign in").click(); await s.wait_for_selector("text=Urgent, unscreened")
        await s.get_by_role("link", name="All reports").click()
        await s.locator("tbody tr").first.click(); await s.wait_for_selector("text=Internal notes and activity")
        ok("Admin sees 'Only the Admin Head can assign'", await s.get_by_text("Only the Admin Head can assign.").is_visible())
        ok("Admin has no publish button", await s.get_by_role("button", name="Approve and publish").count() == 0)
        await s.get_by_role("button", name="Sign out").click()

        # ── Staff: Reporter sees only assigned reports ──
        await s.fill("input[autocomplete=username]", "ram.reporter"); await s.fill("input[type=password]", "demo1234")
        await s.get_by_role("button", name="Sign in").click(); await s.wait_for_selector("text=My assignments")
        n = await s.locator("tbody tr").count()
        ok(f"Reporter sees only own assignments ({n} rows)", n == 2)
        await s.screenshot(path=str(SHOTS / "08-reporter.png"))

        ok("No JavaScript errors", not errors)
        if errors: print("\n".join(errors))
        await b.close()

asyncio.run(main())
failed = [n for n, c in results if not c]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
