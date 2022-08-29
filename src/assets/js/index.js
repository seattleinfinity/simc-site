// Animations and stuff for the homepage

// Extremely hacky; would not recomment
let $ = document.querySelector.bind(document);

let nav = $('nav');
nav.classList.add('-translate-y-full', 'transition-all', 'duration-500');

let minScroll = 20;

let scrollHandler = () => {
  if (
    document.body.scrollTop > minScroll ||
    document.documentElement.scrollTop > minScroll
  ) {
    nav.classList.toggle('-translate-y-full');
    nav.classList.add('top-0', 'z-30');
    window.removeEventListener('scroll', scrollHandler, false);
  }
};

window.addEventListener('scroll', scrollHandler);
window.onload = scrollHandler;
