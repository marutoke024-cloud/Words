/**
 * Low-poly icon set.
 *
 * Each icon is a handful of flat polygons shaded with three opacities of
 * `currentColor`, so an icon picks up whatever accent its context sets — the
 * same faceted look the room is built from, at 1em.
 */
const SVG = {
  tv: `
    <polygon points="2.5,6.2 21.5,4 21.5,16.4 2.5,18.2" opacity=".38"/>
    <polygon points="4.6,8 19.4,6.3 19.4,14.4 4.6,15.9" opacity=".95"/>
    <polygon points="4.6,8 19.4,6.3 4.6,15.9" opacity=".55"/>
    <polygon points="10,18.1 14,17.7 14.9,21 9.1,21.4" opacity=".45"/>
    <polygon points="6.6,20.8 17.4,20.2 17.4,22.1 6.6,22.7" opacity=".7"/>`,
  bookshelf: `
    <polygon points="3,2.6 4.8,2.75 4.8,20.6 3,20.5" opacity=".5"/>
    <polygon points="19.2,3.7 21,3.85 21,21.4 19.2,21.3" opacity=".5"/>
    <polygon points="3,2.6 21,3.85 21,5.1 3,3.9" opacity=".34"/>
    <polygon points="4.8,11.9 19.2,12.7 19.2,14 4.8,13.2" opacity=".5"/>
    <polygon points="4.8,19.5 19.2,20.2 19.2,21.4 4.8,20.7" opacity=".5"/>
    <polygon points="5.9,5.9 8,6.05 8,12 5.9,11.9" opacity=".95"/>
    <polygon points="9.2,6.7 11,6.5 11.3,12.1 9.2,12.05" opacity=".6"/>
    <polygon points="12.4,6.3 14.4,6.45 14.4,12.2 12.4,12.1" opacity=".88"/>
    <polygon points="15.6,7 17.8,6.75 17.9,12.3 15.6,12.25" opacity=".5"/>
    <polygon points="5.9,14 8.3,14.2 8.3,19.7 5.9,19.6" opacity=".6"/>
    <polygon points="9.5,14.8 11.3,14.55 11.6,19.85 9.5,19.8" opacity=".95"/>
    <polygon points="12.6,14.4 14.4,14.55 14.4,19.9 12.6,19.85" opacity=".55"/>
    <polygon points="15.6,15 17.8,14.8 17.9,20 15.6,19.95" opacity=".8"/>`,
  fish: `
    <polygon points="6.4,12 13.4,5.4 21.4,11.3 13.8,18.4" opacity=".95"/>
    <polygon points="6.4,12 13.4,5.4 21.4,11.3" opacity=".5"/>
    <polygon points="6.4,12 1.2,6.8 2.7,12 1.2,17.2" opacity=".66"/>
    <polygon points="11.4,15.6 16.4,15 13.4,18.4" opacity=".38"/>
    <circle cx="17.4" cy="10.7" r="1.25" fill="#fff" opacity=".92"/>`,
  trash: `
    <polygon points="9.6,3.4 14.4,3.1 14.6,5.4 9.5,5.7" opacity=".45"/>
    <polygon points="3.6,6.2 20.4,5.2 20.4,8.2 3.6,9.3" opacity=".55"/>
    <polygon points="5.6,9.4 18.4,8.4 16.8,21.4 7.2,21.9" opacity=".72"/>
    <polygon points="9.2,11.6 10.8,11.5 10.5,19.6 9.1,19.6" opacity="1"/>
    <polygon points="13.2,11.3 14.8,11.2 14.6,19.4 13.2,19.5" opacity="1"/>`
};

export function iconMarkup(name) {
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${SVG[name] || ''}</svg>`;
}

export function iconEl(name, className = '') {
  const span = document.createElement('span');
  span.className = ('ico ' + className).trim();
  span.innerHTML = iconMarkup(name);
  return span;
}
