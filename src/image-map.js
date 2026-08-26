const LOCAL_IMAGE_FILES = new Set([
  'drive-google-com-thumbnail.jpg',
  'i-ibb-co-1501782.png',
  'i-ibb-co-8-B228-F01-8-FD8-43-E2-B15-A-721806-D069846-U9-A3992-2024-10-06-T05-45-04-648-Eric-Shao.jpg',
  'i-ibb-co-AP1-Gcz-Mi-SLUj-LI8p-Jpvn-Xc2r-Ilp-Qk8eg-Zd-D1-Ij1-POCB7-EKOBrk1i-F1-Fragb-Ws-Hgc-E29-BDJf-DU8nry8tm.png',
  'i-ibb-co-IMG-7551.jpg',
  'i-ibb-co-IMG-8422-1-Christopher-Peng.jpg',
  'i-ibb-co-Sophia-Shen-Sophia-Shen.jpg',
  'i-ibb-co-Tiktok-Default-Profile-Picture-Sticker-Sticker-by-tgamez522.jpg',
  'i-ibb-co-pic-Erin-Bian.jpg',
  'i-ibb-co-potm-2021-22.png',
  'i-ibb-co-simc-logo-banner.png',
  'i-ibb-co-slg-2022-23.png',
  'i-ibb-co-yb-picture-Immanuel-Whang.png',
  'i-imgur-com-6fGdnvB.jpeg',
  'i-imgur-com-7DXK7W7.png',
  'i-imgur-com-7qI17Dd.jpeg',
  'i-imgur-com-7sXxPo5.jpeg',
  'i-imgur-com-FLNGVbJ.jpeg',
  'i-imgur-com-GDzrbAN.jpeg',
  'i-imgur-com-JsbqNYP.png',
  'i-imgur-com-Kw278pW.png',
  'i-imgur-com-Nz1aJbU.png',
  'i-imgur-com-Zi0fJmW.png',
  'i-imgur-com-b8YBhj3.jpeg',
  'i-imgur-com-d6poAje.jpeg',
  'i-imgur-com-fDv6pw3.png',
  'i-imgur-com-ghe3OuY.png',
  'i-imgur-com-mgAMlxW.png',
  'i-imgur-com-nchsCSF.png',
  'i-imgur-com-oaoY9dY.png',
  'i-imgur-com-tEQP0eT.png',
  'i-imgur-com-zDUECqV.jpeg',
  'images-unsplash-com-photo-1434030216411-0b793f4b4173.jpg',
  'images-unsplash-com-photo-1450101499163-c8848c66ca85.jpg',
  'images-unsplash-com-photo-1456513080510-7bf3a84b82f8.jpg',
  'images-unsplash-com-photo-1472289065668-ce650ac443d2.jpg',
  'images-unsplash-com-photo-1509228627152-72ae9ae6848d.jpg',
  'images-unsplash-com-photo-1527117499127-8169c886e66e.jpg',
  'images-unsplash-com-photo-1532012197267-da84d127e765.jpg',
  'images-unsplash-com-photo-1563089145-599997674d42.jpg',
  'images-unsplash-com-photo-1574169208507-84376144848b.jpg',
  'images-unsplash-com-photo-1581574919402-5b7d733224d6.jpg',
  'images-unsplash-com-photo-1587825140708-dfaf72ae4b04.jpg',
  'images-unsplash-com-photo-1606326608802-164e734c2fd9.jpg',
  'images-unsplash-com-photo-1634117622592-114e3024ff27.jpg',
  'iusd-org-363785logo.jpg',
  'lh6-googleusercontent-com-o_5G95xeND6QEIr-Sw2dhGThaTwV2RZIbiutsvVW-Ipfpo7F3B0lI994bF9s2i45w0aR_RWID8RJ0Z58BBlgHXAtuv6MOutg7r4JLkoSkUopmfzuuHHYhr-D7dVu-30-V7x2q4ifDvxOU_Zx3pkqd0s.jpg',
  'media-istockphoto-com-multiple-choice-test-with-clock-time-concept-in-exam.jpg',
  'photos-prnewswire-com-363785LOGO.jpg',
  'plus-unsplash-com-premium_photo-1682192408589-0c854e40d98e.jpg',
  't3-ftcdn-net-360_F_234606035_DM6Qb2gXn57DUkJjXfhdi45Vetab3rk7.jpg',
]);

function fileName(source) {
  if (!source || source.startsWith('/')) return '';
  try {
    const url = new URL(source.startsWith('//') ? `https:${source}` : source);
    if (url.hostname.toLowerCase() === 'imgur.com') url.hostname = 'i.imgur.com';
    const host = url.hostname.toLowerCase().replace(/\./g, '-');
    const rawName = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || 'image');
    const extension = rawName.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || 'jpg';
    const stem = (rawName.replace(/\.[^.]+$/, '') || 'image').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
    return `${host}-${stem}.${extension}`;
  } catch {
    return '';
  }
}

export function localizeImage(source) {
  const name = fileName(source);
  return name && LOCAL_IMAGE_FILES.has(name) ? `/assets/images/migrated/${name}` : source;
}
