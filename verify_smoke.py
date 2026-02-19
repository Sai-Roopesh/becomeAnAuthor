from playwright.sync_api import sync_playwright

def test_smoke():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Test Dashboard
        page.goto("http://localhost:3000")
        if page.get_by_role("heading", name="Series").is_visible():
            print("Dashboard: Series heading visible")
        else:
            print("Dashboard: Series heading NOT visible")

        # Test Project Route
        page.goto("http://localhost:3000/project")
        if page.get_by_role("heading", name="No Project Selected").is_visible():
            print("Project: No Project Selected visible")
        else:
            print("Project: No Project Selected NOT visible")

        browser.close()

if __name__ == "__main__":
    test_smoke()
