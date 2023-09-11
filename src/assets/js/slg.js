function updatePersonHeight(index, isEnter) {
  let container = document.getElementById(`container-${index}`);
  if (isEnter) {
    let back = document.getElementById(`back-${index}`);
    container.style.height = (back.clientHeight + 50).toString() + 'px';
  } else {
    let front = document.getElementById(`front-${index}`);
    container.style.height = (front.clientHeight + 120).toString() + 'px';
  }
}
