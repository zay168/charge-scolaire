document.addEventListener('DOMContentLoaded', () => {

    // 1. INITIALIZE LENIS (Smooth Scroll)
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 2. REGISTER GSAP PLUGINS
    gsap.registerPlugin(ScrollTrigger);

    // 3. HERO ANIMATIONS (Load sequence)
    const tl = gsap.timeline();

    tl.from('.navbar', {
        y: -100,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
    })
        .from('.reveal', {
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: 'power3.out'
        }, '-=0.5')
        .from('.reveal-scale', {
            scale: 0.9,
            opacity: 0,
            duration: 1,
            ease: 'back.out(1.7)'
        }, '-=0.5');

    // 4. SCROLL REVEAL ANIMATIONS
    gsap.utils.toArray('.reveal-up').forEach(elem => {
        gsap.from(elem, {
            scrollTrigger: {
                trigger: elem,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
            },
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        });
    });

    // 5. PARALLAX EFFECT ON HERO VISUAL
    document.addEventListener('mousemove', (e) => {
        const mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
        const mouseY = (e.clientY / window.innerHeight - 0.5) * 20;

        gsap.to('.app-window', {
            rotationY: mouseX,
            rotationX: -mouseY,
            duration: 1,
            ease: 'power2.out'
        });

        gsap.to('.float-badge.badge-1', {
            x: mouseX * 2,
            y: mouseY * 2,
            duration: 1.5,
            ease: 'power2.out'
        });

        gsap.to('.float-badge.badge-2', {
            x: -mouseX * 2,
            y: -mouseY * 2,
            duration: 1.5,
            ease: 'power2.out'
        });
    });

    // 6. SECTION REVEALS
    ScrollTrigger.batch('.bento-item', {
        onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.1, overwrite: true }),
        onLeave: batch => gsap.set(batch, { opacity: 0, y: 50, overwrite: true }),
        onEnterBack: batch => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.1, overwrite: true }),
        onLeaveBack: batch => gsap.set(batch, { opacity: 0, y: 50, overwrite: true })
    });

    console.log("🚀 Charge Scolaire: Ready for lift-off.");
});
