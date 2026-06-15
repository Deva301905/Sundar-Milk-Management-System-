// static/js/landing.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Close mobile menu when a link is clicked
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });

    // 2. Scroll Animation Observer (Intersection Observer API)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of element is visible
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once animated in
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Attach observer to all elements with fade-in-up class
    const fadeElements = document.querySelectorAll('.fade-in-up');
    fadeElements.forEach(el => scrollObserver.observe(el));

    // 3. Navbar styling on scroll (Solid white background when scrolled down)
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('shadow-md', 'bg-white');
            navbar.classList.remove('bg-white/80', 'backdrop-blur-md', 'shadow-sm');
        } else {
            navbar.classList.remove('shadow-md', 'bg-white');
            navbar.classList.add('bg-white/80', 'backdrop-blur-md', 'shadow-sm');
        }
    });
});