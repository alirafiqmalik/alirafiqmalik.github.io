/* Theme Toggle */
(function () {
    function getTheme() {
        return localStorage.getItem('theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        setTheme(current === 'dark' ? 'light' : 'dark');
    }

    // Initialize
    setTheme(getTheme());

    // Bind toggle buttons
    document.addEventListener('DOMContentLoaded', function () {
        const toggles = document.querySelectorAll('#theme-toggle, #theme-toggle-mobile');
        toggles.forEach(function (toggle) {
            toggle.addEventListener('click', toggleTheme);
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', function () {
                const isOpen = mobileMenu.classList.contains('open');
                mobileMenu.classList.toggle('open', !isOpen);
                menuToggle.classList.toggle('open', !isOpen);
            });

            // Close mobile menu on link click
            mobileMenu.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    mobileMenu.classList.remove('open');
                    menuToggle.classList.remove('open');
                });
            });
        }
    });
})();
