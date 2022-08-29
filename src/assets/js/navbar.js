const btn = document.querySelector('button.mobile-menu-button');
const menu = document.querySelector('.mobile-menu');

// Add Event Listeners
btn.addEventListener('click', () => {
  menu.classList.toggle('max-h-0');

  // Hard-coded; should change
  menu.classList.toggle('max-h-[288px]');
});
