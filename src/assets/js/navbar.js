const btn = document.querySelector('button.mobile-menu-button');
const menu = document.querySelector('.mobile-menu');

// Add Event Listeners
btn.addEventListener('click', () => {
  menu.classList.toggle('max-h-0');
  menu.classList.toggle('max-h-96');
});
