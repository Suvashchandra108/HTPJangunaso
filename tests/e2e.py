"""End-to-end check of the demo against the success criteria.
Run: npm run build && npx vite preview --port 4173 &
     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/e2e.py [screenshot-dir]
"""
import asyncio, pathlib, re, sys
from playwright.async_api import async_playwright

BASE = "http://localhost:4173/"
SHOTS = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "test-shots"); SHOTS.mkdir(exist_ok=True)
results = []

def ok(name, cond=True):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errors = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, permissions=[])
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))

        # ── Home ──
        await pg.goto(BASE); await pg.wait_for_selector("text=तपाईंको आवाज, हाम्रो खबर।")
        ok("Home opens in Nepali by default")
        ok("Big buttons show the English word under Nepali", await pg.locator(".hero-cta .bi-en", has_text="Report").count() == 1)
        ok("Emergency strip calls police 100", await pg.locator("a.sos-strip[href='tel:100']").count() == 1)
        ok("WhatsApp button goes to HTP's official number", "wa.me/9779851330200" in (await pg.locator("a.wa-btn").first.get_attribute("href")))
        await pg.screenshot(path=str(SHOTS / "01-home.png"), full_page=True)
        await pg.get_by_role("button", name="EN", exact=True).click()
        ok("Switch to English", await pg.get_by_text("Your voice, our news.").is_visible())
        await pg.get_by_role("button", name="मैथिली", exact=True).click()
        ok("Switch to Maithili", await pg.get_by_text("अहाँक आवाज, हमर खबर।").is_visible())
        await pg.get_by_role("button", name="नेपाली", exact=True).click()

        # ── Report (urgent) ──
        await pg.get_by_role("link", name=re.compile("^सडक")).click()
        await pg.wait_for_selector("#what")
        ok("Category tile pre-selects Road", await pg.get_by_role("button", name=re.compile("^सडक"), pressed=True).count() == 1)
        text = "लहान बजार नजिक सडकमा ठूलो खाल्डो छ, मान्छे घाइते छन्।"
        await pg.fill("#what", text)
        await pg.get_by_role("button", name="मैथिली", exact=True).click()
        ok("Typed text survives switch to Maithili", await pg.input_value("#what") == text and await pg.get_by_text("की भेल?").is_visible())
        await pg.get_by_role("button", name="EN", exact=True).click()
        ok("Typed text survives switch to English", await pg.input_value("#what") == text)
        await pg.reload(); await pg.wait_for_selector("#what")
        ok("Typed text survives a page reload", await pg.input_value("#what") == text)

        await pg.get_by_label(re.compile("Yes — urgent")).check()
        ok("Urgent shows emergency panel with police 100", await pg.locator(".emergency a[href='tel:100']").count() == 1)
        ok("Road emergency also offers ambulance 102", await pg.locator(".emergency a[href='tel:102']").count() == 1)
        await pg.screenshot(path=str(SHOTS / "02-urgent-form.png"), full_page=True)

        await pg.get_by_role("button", name=re.compile("^Send")).click()
        ok("Validation: consent required", await pg.get_by_text("Tick the box above").first.is_visible())

        await pg.get_by_role("link", name=re.compile("Add location")).click()
        await pg.get_by_role("button", name="Use where I am now").click()
        await pg.wait_for_timeout(800)
        ok("GPS denied shows a friendly message", await pg.get_by_text("Location permission denied").is_visible() or await pg.get_by_text("Couldn't find your location").is_visible())
        await pg.get_by_role("tab", name="Choose myself").click()
        await pg.get_by_label("Province").select_option("madhesh")
        await pg.get_by_label("District").select_option("siraha")
        await pg.get_by_label("Municipality").select_option("siraha:lahan-municipality")
        await pg.get_by_label("Ward no.").select_option("5")
        await pg.get_by_role("button", name="This is the place").click()
        ok("Manual location saved", await pg.get_by_text("Lahan Municipality").is_visible())

        await pg.get_by_label("The information I gave").check()
        await pg.get_by_role("button", name=re.compile("^Send")).click()
        await pg.wait_for_selector("text=Report received")
        ref = (await pg.locator(".card-raised .mono").first.inner_text()).strip()
        ok(f"Anonymous submission creates BS-year number ({ref})", ref.startswith("HTP-208") and len(ref) == 15)
        ok("Urgent confirmation repeats call buttons", await pg.locator(".emergency a[href='tel:100']").count() == 1)
        wa = await pg.locator(".emergency a.wa-btn").get_attribute("href")
        ok("WhatsApp message to HTP has number, topic and place", "9779851330200" in wa and ref in wa and "Lahan" in __import__("urllib.parse").parse.unquote(wa))
        await pg.wait_for_selector(".qr-box img")
        ok("QR code shown", True)
        link = await pg.locator(".panel-ink > .mono").inner_text()
        token = link.rsplit("/", 1)[-1]
        await pg.screenshot(path=str(SHOTS / "03-done.png"), full_page=True)

        # ── Tracking ──
        await pg.goto(BASE + "#/track"); await pg.wait_for_selector(".my-item")
        ok("My reports lists the report without typing a code", ref in await pg.locator(".my-item").first.inner_text())
        await pg.locator(".my-item").first.click()
        await pg.wait_for_selector("text=Your report has reached HTP Khabar.")
        body = await pg.inner_text("main")
        ok("Timeline shows Received with a date", "Received" in body and "Kartik" in body)
        ok("Tracking hides staff names and notes", "reporter" not in body and "admin" not in body.lower())
        await pg.screenshot(path=str(SHOTS / "04-track.png"), full_page=True)
        await pg.goto(BASE + f"#/track/{ref}/wrongtoken"); await pg.wait_for_timeout(500)
        ok("Wrong token is rejected", await pg.get_by_text("didn't match").is_visible())

        await pg.goto(BASE + "#/explore"); await pg.wait_for_selector(".article")
        ok("Public archive lists only approved reports", await pg.locator(".article").count() == 3)

        # ── Newsroom: Admin Head, English ──
        sctx = await b.new_context(viewport={"width": 1440, "height": 900})
        await sctx.add_init_script("localStorage.setItem('htp-janagunaso-lang','en')")
        s = await sctx.new_page(); s.on("pageerror", lambda e: errors.append(str(e)))
        async def login(who):
            await s.goto(BASE + "#/staff")
            await s.fill("input[autocomplete=username]", who); await s.fill("input[type=password]", "demo1234")
            await s.get_by_role("button", name="Sign in").click()
        await login("admin.head")
        await s.wait_for_selector(".urgent-banner")
        ok("Today shows the urgent banner", "urgent" in (await s.locator(".urgent-banner").inner_text()).lower())
        ok("Today shows three lanes", await s.locator(".lane").count() == 3)
        ok("Late assignment is flagged", await s.locator(".late-strip").count() == 1)
        await s.screenshot(path=str(SHOTS / "05-today.png"))

        await s.locator(".urgent-banner").click()
        await s.wait_for_selector(".drawer .next-bar")
        ok("Report opens in a side panel", True)
        async def nxt(label):
            await s.locator(".drawer .next-bar button.next-btn", has_text=label).click(); await s.wait_for_timeout(150)
        await nxt("Start checking"); await nxt("Checked — looks real"); await nxt("Assign reporter")
        await s.get_by_label("ram.reporter").check(); await s.get_by_role("button", name="Save", exact=True).click()
        ok("Admin Head assigns a reporter through the next-step button", await s.get_by_text("Assignment saved").is_visible())
        await s.locator(".drawer summary", has_text="Other actions").click()
        await s.locator(".menu-list button", has_text="Ask the citizen").click()
        await s.locator(".modal textarea").fill("Which tole is affected?")
        await s.locator(".modal").get_by_role("button", name="Send").click()
        await nxt("Start reporting"); await nxt("Send for decision"); await nxt("Write public summary")
        await s.locator(".modal input").first.fill("राजविराजमा तटबन्ध काटिने खतरा")
        await s.locator(".modal textarea").fill("नागरिक रिपोर्टपछि HTP खबरले स्थिति अनुगमन गरिरहेको छ।")
        await s.locator(".modal").get_by_role("button", name="Save").click()
        await nxt("Approve & publish")
        ok("Next-step flow ends in publication", await s.locator(".drawer .box-ink", has_text="Public").count() >= 1)
        await s.screenshot(path=str(SHOTS / "06-drawer.png"))
        await s.keyboard.press("Escape")

        await s.get_by_role("link", name="Board").click(); await s.wait_for_selector(".board")
        ok("Board has five columns", await s.locator(".board .col").count() == 5)
        await s.screenshot(path=str(SHOTS / "07-board.png"))
        await s.get_by_role("link", name=re.compile("^All reports")).click(); await s.wait_for_selector("table.inbox tbody tr")
        ok("All reports table loads", await s.locator("table.inbox tbody tr").count() >= 7)
        await s.get_by_role("button", name="नेपाली", exact=True).click()
        ok("Newsroom switches to Nepali", await s.get_by_role("heading", name="सबै रिपोर्ट").is_visible())
        await s.get_by_role("button", name="EN", exact=True).click()
        await s.get_by_role("button", name="Sign out").click()

        # ── Admin: cannot assign or publish ──
        await login("admin"); await s.wait_for_selector(".lane")
        await s.locator(".rcard").first.click(); await s.wait_for_selector(".drawer .next-bar")
        ok("Admin is told only the Admin Head can assign", await s.get_by_text("Only the Admin Head can assign.").is_visible())
        ok("Admin has no publish button", await s.locator(".drawer button", has_text="Approve & publish").count() == 0)
        await s.keyboard.press("Escape"); await s.get_by_role("button", name="Sign out").click()

        # ── Reporter: only own assignments ──
        await login("ram.reporter"); await s.wait_for_selector("h1:has-text('Reports assigned to me')")
        n = await s.locator(".rcard").count()
        ok(f"Reporter sees only own assignments ({n})", n == 2)
        await s.screenshot(path=str(SHOTS / "08-reporter.png"))

        # ── Newsroom on a phone ──
        m = s; await m.set_viewport_size({"width": 390, "height": 844})
        await m.goto(BASE + "#/staff/today"); await m.wait_for_selector(".staff-nav"); await m.wait_for_timeout(300)
        ok("Newsroom fits a phone (no sideways scroll)", await m.evaluate("document.documentElement.scrollWidth <= 392"))
        await m.screenshot(path=str(SHOTS / "09-staff-phone.png"), full_page=True)

        ok("No JavaScript errors", not errors)
        if errors: print("\n".join(errors))
        await b.close()

asyncio.run(main())
failed = [n for n, c in results if not c]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
