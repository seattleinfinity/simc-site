// Animations and stuff for the homepage

// Extremely hacky; would not recomment
const $ = document.querySelector.bind(document);

const downArrow = $('#down-arrow');
const nav = $('nav');
nav.classList.add('-translate-y-full', 'transition-all', 'duration-500');

const minScroll = 20;

const scrollHandler = () => {
  if (
    document.body.scrollTop > minScroll ||
    document.documentElement.scrollTop > minScroll
  ) {
    nav.classList.toggle('-translate-y-full');
    nav.classList.add('top-0', 'z-30');
    downArrow.style.transitionDelay = '0s';
    downArrow.style.opacity = 0;
    window.removeEventListener('scroll', scrollHandler, false);
  }
};

window.addEventListener('scroll', scrollHandler);
window.onload = scrollHandler;