import { initTheme } from '../shared/theme.js';
initTheme();

// Animate nav cards on load
const cards = document.querySelectorAll('.nav-card');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('animated'), i * 100);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
cards.forEach(c => observer.observe(c));

// Animate sections on scroll
const sections = document.querySelectorAll('.animate-fadeInUp');
const secObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.animationPlayState = 'running';
      secObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
sections.forEach(s => {
  s.style.animationPlayState = 'paused';
  secObs.observe(s);
});
