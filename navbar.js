const NAVBAR_HTML = `
<!-- Header -->
<header>
    <a href="index.html" class="logo">KRATEX MEMBERS ZONE 🔑</a>

    <!-- Mobile Actions (Right) -->
    <div class="mobile-actions">
        <button id="mobile-search-trigger" class="mobile-nav-btn"><i class="fa-solid fa-search"></i></button>
        <button id="mobile-menu-trigger" class="mobile-nav-btn"><i class="fa-solid fa-bars"></i></button>
    </div>

    <!-- Desktop Search Bar -->
    <div class="search-container desktop-only">
        <input type="text" id="search-input" placeholder="SEARCH CATALOG...">
        <div id="search-dropdown" class="dropdown-results hidden"></div>
    </div>

    <!-- Desktop Nav -->
    <nav class="desktop-only">
        <a href="https://kratex.in" target="_blank">KRATEX WEBSITE</a>
        <a href="https://shows.kratex.in" target="_blank">SHOW TICKETS</a>
    </nav>
</header>

<!-- Mobile Menu Overlay -->
<div id="mobile-menu-overlay" class="mobile-overlay hidden">
    <div class="mobile-header">
        <span class="logo">MENU</span>
        <button id="close-menu-btn" class="mobile-close-btn"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="mobile-nav-links">
        <a href="https://kratex.in" target="_blank">KRATEX WEBSITE</a>
        <a href="https://shows.kratex.in" target="_blank">SHOW TICKETS</a>
        <a href="access.html">GET ACCESS</a>
    </div>
</div>

<!-- Mobile Search Overlay -->
<div id="mobile-search-overlay" class="mobile-overlay hidden">
    <div class="mobile-header">
        <span class="logo">SEARCH</span>
        <button id="close-search-btn" class="mobile-close-btn"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="mobile-search-container">
        <input type="text" id="mobile-search-input" placeholder="Type to search tracks...">
        <div id="mobile-search-dropdown" class="dropdown-results"></div>
    </div>
</div>
`;

const FOOTER_HTML = `
<footer class="site-footer">
    <div class="footer-inner">
        <a href="index.html" class="logo footer-logo">KRATEX STORE</a>
        <div class="footer-links">
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
            <a href="mailto:contact@kratex.in">Contact</a>
            <a href="admin.html">Admin</a>
            <div class="social-links">
                <a href="#" target="_blank"><i class="fa-brands fa-instagram"></i></a>
                <a href="#" target="_blank"><i class="fa-brands fa-youtube"></i></a>
            </div>
        </div>
        <div class="copyright">© 2025 Kratex.</div>
    </div>
</footer>
`;

function initNavbar() {
    const container = document.getElementById('navbar-root');
    if (container) {
        container.innerHTML = NAVBAR_HTML;
    } else {
        console.warn("Navbar root element not found!");
    }
}

function initFooter() {
    const container = document.getElementById('footer-root');
    if (container) {
        container.innerHTML = FOOTER_HTML;
    }
}

function setupMobileNav() {
    // Menu
    const menuBtn = document.getElementById('mobile-menu-trigger');
    const menuOverlay = document.getElementById('mobile-menu-overlay');
    const closeMenu = document.getElementById('close-menu-btn');

    if (menuBtn) menuBtn.addEventListener('click', () => menuOverlay.classList.remove('hidden'));
    if (closeMenu) closeMenu.addEventListener('click', () => menuOverlay.classList.add('hidden'));

    // Search
    const searchBtn = document.getElementById('mobile-search-trigger');
    const searchOverlay = document.getElementById('mobile-search-overlay');
    const closeSearch = document.getElementById('close-search-btn');
    const searchInput = document.getElementById('mobile-search-input');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            searchOverlay.classList.remove('hidden');
            if (searchInput) setTimeout(() => searchInput.focus(), 100);
        });
    }
    if (closeSearch) closeSearch.addEventListener('click', () => searchOverlay.classList.add('hidden'));
}

