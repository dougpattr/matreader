/* Ícones e pictogramas de traço, desenhados à mão no espírito do Nomadic
   Tribe: nanquim, ponta arredondada, linhas levemente irregulares. Cada uso
   herda a cor do texto. Os ícones de interface entram inline (Icon.vue)
   para que as partes marcadas com class="a"/"b" possam se mexer sozinhas
   (seta que desce, tampa que abre, ponteiro que gira — ver motion.css); o
   sprite continua servindo os pictogramas e o HTML gerado do documento. */

const ui: Record<string, string> = {
  bolt: '<path d="M13.2 2.6 5.2 13.3h5.6l-.5 8.2 8.6-11.2h-5.9l.2-7.7z"/>',
  doc: '<path d="M14 3.2H7.1A1.7 1.7 0 0 0 5.4 4.9v14.3a1.7 1.7 0 0 0 1.7 1.6h9.8a1.7 1.7 0 0 0 1.7-1.6V7.8z"/><path d="M13.9 3.4v4.4h4.4M8.7 12.9c2.2-.2 4.5.1 6.7-.1M8.7 16.3c1.6.1 3.2-.1 4.8 0"/>',
  parcel: '<path d="M3.9 8.6 11 3.9l9 5.1-2.6 10.3-10.5-1.6z"/><circle cx="11" cy="3.9" r="1.5" fill="currentColor" stroke="none"/>',
  pages: '<rect x="3.5" y="6.7" width="12.3" height="14" rx="1.6"/><path d="M7.7 3.5h10.9a1.6 1.6 0 0 1 1.6 1.6v11.5"/>',
  archive: '<rect class="a" x="3.3" y="3.7" width="17.4" height="4.8" rx="1.2"/><path d="M5 8.5v10.1a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6V8.5M9.8 12.6c1.5.1 2.9-.1 4.4 0"/>',
  braces: '<path class="a" d="M9.6 3.5C7.3 3.4 7.2 6 7.2 7.6s0 3.2-2.4 3.3v2.3c2.4 0 2.4 1.6 2.4 3.2s0 4.3 2.4 4.2"/><path class="b" d="M14.4 3.5c2.3-.1 2.4 2.5 2.4 4.1s0 3.2 2.4 3.3v2.3c-2.4 0-2.4 1.6-2.4 3.2s0 4.3-2.4 4.2"/>',
  gauge: '<path d="M3.7 18.4a8.7 8.7 0 1 1 16.6 0"/><path class="a" d="M12 18.3 16.3 12"/>',
  check: '<path class="a" pathLength="1" d="M4.8 12.7c1.7 1.5 3.3 3.2 5 4.9 3.1-3.7 6.3-7.2 9.6-10.8" stroke-width="2.3"/>',
  x: '<path d="M5.8 5.6c4.2 4.3 8.5 8.6 12.6 12.8M18.3 5.7c-4.2 4.1-8.4 8.4-12.6 12.7" stroke-width="2"/>',
  alert: '<path d="M12 3.5c3.3 5.7 6.7 11.3 10 17H2.1c3.3-5.7 6.6-11.3 9.9-17z"/><path d="M12 9.7v4.5"/><circle cx="12" cy="17.3" r="1" fill="currentColor" stroke="none"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11.4v5"/><circle cx="12" cy="8.2" r="1" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="6.6"/><path d="M15.9 15.8c1.6 1.6 3.2 3.2 4.7 4.8"/>',
  expand: '<path d="M9 3.6H3.6V9M15 3.6h5.4V9M15 20.4h5.4V15M9 20.4H3.6V15"/>',
  collapse: '<path d="M3.6 9H9V3.6M20.4 9H15V3.6M20.4 15H15v5.4M3.6 15H9v5.4"/>',
  print: '<path d="M6.6 9V3.8h10.8V9"/><rect x="3.4" y="9" width="17.2" height="7.6" rx="1.6"/><path class="a" d="M6.6 13.8h10.8v6.4H6.6z"/>',
  moon: '<path d="M20.4 13.6A8.6 8.6 0 0 1 10.4 3.6a8.6 8.6 0 1 0 10 10z"/>',
  sun: '<circle cx="12" cy="12" r="4.4"/><path class="a" d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>',
  help: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.7v.4"/><circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none"/>',
  gear: '<circle cx="12" cy="12" r="3.1"/><path d="M19.4 14.2a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9h-.2a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9z"/>',
  plus: '<path d="M12 5.4c.1 4.4-.1 8.8 0 13.2M5.4 12c4.4.1 8.8-.1 13.2 0" stroke-width="2"/>',
  minus: '<path d="M5.4 12.1c4.4-.1 8.8.1 13.2-.1" stroke-width="2"/>',
  up: '<path d="M5.8 14.6c2.1-2 4.1-4.1 6.2-6.2 2.1 2 4.1 4.1 6.2 6.2" stroke-width="2.1"/>',
  down: '<path d="M5.8 9.4c2.1 2 4.1 4.1 6.2 6.2 2.1-2.1 4.1-4.2 6.2-6.2" stroke-width="2.1"/>',
  right: '<path d="M9.4 5.8c2 2.1 4.1 4.1 6.2 6.2-2.1 2.1-4.2 4.1-6.2 6.2" stroke-width="2.1"/>',
  left: '<path d="M14.6 5.8c-2 2.1-4.1 4.1-6.2 6.2 2.1 2.1 4.2 4.1 6.2 6.2" stroke-width="2.1"/>',
  grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></g>',
  'rot-ccw': '<path d="M4.2 11.4a8 8 0 1 1 2.1 6"/><path d="M3.4 5.6v5.9h5.9"/>',
  'rot-cw': '<path d="M19.8 11.4a8 8 0 1 0-2.1 6"/><path d="M20.6 5.6v5.9h-5.9"/>',
  target: '<circle cx="12" cy="12" r="7.6"/><path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  layers: '<path class="a" d="M12 3.4 21 8l-9 4.6L3 8z"/><path d="M3 12.4 12 17l9-4.6M3 16.6l9 4.6 9-4.6"/>',
  copy: '<rect class="a" x="9" y="9" width="11.6" height="11.6" rx="1.8"/><path d="M15.4 9V5.2a1.8 1.8 0 0 0-1.8-1.8H5.2a1.8 1.8 0 0 0-1.8 1.8v8.4a1.8 1.8 0 0 0 1.8 1.8H9"/>',
  download: '<path class="a" d="M12 3.6c.1 3.7-.1 7.5 0 11.2M7.4 10.4 12 15l4.6-4.6"/><path d="M4 17.6V19a1.6 1.6 0 0 0 1.6 1.6h12.8A1.6 1.6 0 0 0 20 19v-1.4"/>',
  upload: '<path class="a" d="M12 20.4c-.1-3.7.1-7.5 0-11.2M7.4 13.4 12 8.8l4.6 4.6"/><path d="M4 6.4V5a1.6 1.6 0 0 1 1.6-1.6h12.8A1.6 1.6 0 0 1 20 5v1.4"/>',
  globe: '<circle cx="12" cy="12" r="8.6"/><path class="a" d="M3.4 12h17.2M12 3.4c2.2 2.4 3.4 5.4 3.4 8.6s-1.2 6.2-3.4 8.6c-2.2-2.4-3.4-5.4-3.4-8.6S9.8 5.8 12 3.4z"/>',
  trash: '<path class="a" d="M4.6 6.6h14.8M9.4 6.6V4.8a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v1.8"/><path d="M6.4 6.6v12.6a1.6 1.6 0 0 0 1.6 1.6h8a1.6 1.6 0 0 0 1.6-1.6V6.6"/>',
  file: '<path d="M13.6 3.4H7a1.6 1.6 0 0 0-1.6 1.6v14a1.6 1.6 0 0 0 1.6 1.6h10a1.6 1.6 0 0 0 1.6-1.6V8.4z"/><path d="M13.5 3.5v4.9h5"/>',
  new: '<path d="M13.6 3.4H7a1.6 1.6 0 0 0-1.6 1.6v14a1.6 1.6 0 0 0 1.6 1.6h10a1.6 1.6 0 0 0 1.6-1.6V8.4z"/><path d="M13.5 3.5v4.9h5M12 11.6v5.2M9.4 14.2h5.2"/>',
  save: '<path d="M5.6 3.6h9.8l3.6 3.6v11.2a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.4V5.2a1.6 1.6 0 0 1 1.6-1.6z"/><path d="M8 3.6v5h6.4v-5M8 20v-5.4h8V20"/>',
  shield: '<path d="M12 3.2 5 6v5.4c0 4.2 2.9 8.1 7 9.4 4.1-1.3 7-5.2 7-9.4V6z"/>',
  camera: '<path d="M4.2 8.4h3l1.6-2.6h6.4l1.6 2.6h3a1.4 1.4 0 0 1 1.4 1.4v8.2a1.4 1.4 0 0 1-1.4 1.4H4.2A1.4 1.4 0 0 1 2.8 18V9.8a1.4 1.4 0 0 1 1.4-1.4z"/><circle cx="12" cy="13.6" r="3.4"/>',
  offline: '<path d="M2.8 8.6a13.4 13.4 0 0 1 18.4 0M5.9 12a8.8 8.8 0 0 1 12.2 0M9 15.3a4.3 4.3 0 0 1 6 0"/><circle cx="12" cy="18.6" r="1.1" fill="currentColor" stroke="none"/><path class="a" pathLength="1" d="M3.6 3.6c5.6 5.6 11.2 11.2 16.8 16.8" stroke-width="2"/>',
  plug: '<path d="M8.6 3.6v4M15.4 3.6v4M6.4 7.6h11.2v3.6a5.6 5.6 0 0 1-11.2 0zM12 16.8v3.6"/>',
  refresh: '<path d="M19.6 12a7.6 7.6 0 1 1-2.2-5.4"/><path d="M19.8 4.2v4.6h-4.6"/>',
  eye: '<path d="M2.6 12s3.4-6.2 9.4-6.2 9.4 6.2 9.4 6.2-3.4 6.2-9.4 6.2S2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.8"/>',
  indent: '<path d="M4 5.6h16M10 10h10M10 14h10M4 18.4h16"/><path d="M4.2 9.4c1 .9 2 1.7 3 2.6-1 .9-2 1.8-3 2.6"/>',
  sort: '<path d="M7.4 4.4v15.2M4.4 16.6l3 3 3-3M16.6 19.6V4.4M13.6 7.4l3-3 3 3"/>',
  more: '<g fill="currentColor" stroke="none"><circle cx="5.6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.4" cy="12" r="1.7"/></g>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path class="a" d="M12 7.2V12l3.2 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3.2-3.2a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3.2 3.2a4 4 0 0 0 5.7 5.7l1-1"/>',
  sparkle: '<path d="M12 3.4c.6 4.1 2.6 6.4 6.8 7-4.2.7-6.2 2.9-6.8 7.2-.6-4.3-2.6-6.5-6.8-7.2 4.2-.6 6.2-2.9 6.8-7z"/><path class="b" d="M18.6 3.6c.2 1.3.8 2 2 2.2-1.2.2-1.8.9-2 2.2-.2-1.3-.8-2-2-2.2 1.2-.2 1.8-.9 2-2.2z"/>',
  wasm: '<path d="M3.4 4.4h6.2a2.4 2.4 0 0 0 4.8 0h6.2v15.2H3.4z"/><path d="M6.4 11.2l1 4.4 1.3-3.6 1.3 3.6 1-4.4M13.4 15.6l1.4-4.4h.4l1.4 4.4M14 14.2h2"/>',
  /* setas à mão: haste ondulada e ponta aberta, como a seta do site */
  'arrow-up': '<path d="M12.2 21.2c-.5-3.2.4-6.1 0-9.3s-.6-5.2-.2-8.4"/><path d="M6.8 9.2c1.9-1.9 3.5-3.8 5.3-6 1.7 2.1 3.4 4 5.4 5.7"/>',
  'arrow-down': '<path d="M11.8 2.8c.5 3.2-.4 6.1 0 9.3s.6 5.2.2 8.4"/><path d="M17.2 14.8c-1.9 1.9-3.5 3.8-5.3 6-1.7-2.1-3.4-4-5.4-5.7"/>',
  'arrow-right': '<path d="M2.8 12.2c3.2-.5 6.1.4 9.3 0s5.2-.6 8.4-.2"/><path d="M14.8 6.8c1.9 1.9 3.8 3.5 6 5.3-2.1 1.7-4 3.4-5.7 5.4"/>',
  'arrow-left': '<path d="M21.2 11.8c-3.2.5-6.1-.4-9.3 0s-5.2.6-8.4.2"/><path d="M9.2 17.2c-1.9-1.9-3.8-3.5-6-5.3 2.1-1.7 4-3.4 5.7-5.4"/>',
  'arrow-curve': '<path d="M4 18.6c1.2-6.6 6.4-11 14.6-10.6"/><path d="M14.6 4.2c1.7 1.3 3.4 2.6 5.2 3.8-1.2 1.8-2.4 3.4-3.6 5.2"/>',
};

const pictos: Record<string, string> = {
  feather:
    '<path d="M9.5 42.5C17 33.6 26.4 21.8 38.6 6.4"/><path d="M38.6 6.4c-7.4 1.2-15.9 6.8-21 16.2-3.1 5.8-3.4 10.2-2.6 13.4 4.1-1.4 9.1-2.6 13.2-7.4C34.5 21.4 37.6 13.9 38.6 6.4z"/><path d="M21.9 23.4c1.8-.6 3.6-.9 5.6-.8M19.4 28.5c2.3-.6 4.4-.9 6.6-.7M25.8 17.3c1.5-.4 3-.6 4.6-.6M17.1 33.3c1.7-.4 3.5-.7 5.3-.7"/><path d="M9.5 42.5l-2.6 2.4"/>',
  crystal:
    '<path d="M24 3.8l9.4 8.6-.3 23.4L24 44.2l-9.2-8.5.2-23.3z"/><path d="M24 3.8l.1 40.4M15 12.4c3 1.6 6 3.1 9 4.6 3.1-1.5 6.2-3 9.4-4.6M14.8 35.7c3.1-1.5 6.1-3 9.3-4.5 3 1.5 6 3 9 4.6"/><path d="M28 9.5l-1.3 4.4M19 24l1.4 5.4" stroke-width="1"/>',
  bird:
    '<path d="M5 27.8c5.6-3.2 11.6-3.6 17.4-1.1 3.4-7.4 9.4-12.3 18.6-13.6-5.2 3.9-8.6 8.6-10.2 14.4 3.9-.4 7.8.6 11.2 3.2-6.1-.4-11.8.2-17.4.6-7 .5-13.1-.6-19.6-3.5z"/><path d="M22.4 26.7c-1.3-6-4.4-10.6-10.4-13.8 2.4 4.6 3.6 9 3.4 13.4"/><circle cx="37.6" cy="29.4" r=".9" fill="currentColor" stroke="none"/>',
  mountain:
    '<path d="M3.5 35.8 15.6 17.6l6.6 9.4 7.6-13.6 14.7 22.4"/><path d="M12.2 22.8c1.4.7 2.6 1.6 3.4 2.9 1-1.4 2.1-2 3.4-2.3M26.4 19.4c1.3.9 2.5 1.6 3.4 3 .9-1.3 2-2.3 3.6-2.6"/><path d="M7.6 41.6c4.6-1.6 9.2-1.4 13.8-.2s9.6 1.3 14.6-.5 6.5-.4 8.6.6" stroke-dasharray="2.6 3.2"/><path d="M33.6 35.8V24.6l6 2.4-6 2.6"/>',
  scroll:
    '<path d="M13.4 8.2h21.4a4.2 4.2 0 0 1 4.2 4.2v25.4a4.2 4.2 0 0 1-4.2 4.2H16.6"/><path d="M13.4 8.2a4.2 4.2 0 0 0-4.2 4.2v2.2h8.4v-2.2a4.2 4.2 0 0 0-4.2-4.2z"/><path d="M17.6 14.6V38a4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4h3.8"/><path d="M22.4 16.6c4.1-.2 8.1.2 12.2 0M22.4 22.4c4.1.1 8.1-.2 12.2 0M22.4 28.2c2.6-.1 5.3.1 7.9 0"/>',
  pages:
    '<path d="M15.2 9.4h16l7.4 7.4v23.4a2.2 2.2 0 0 1-2.2 2.2H15.2a2.2 2.2 0 0 1-2.2-2.2V11.6a2.2 2.2 0 0 1 2.2-2.2z"/><path d="M31.2 9.6v7.2h7.2M8.4 15.4v26.4a2.4 2.4 0 0 0 2.4 2.4h20.6"/><path d="M19.6 5.4v12.2a3 3 0 0 0 6 0V8.2"/><path d="M18.6 24.6c4.6-.2 9.2.1 13.8 0M18.6 30.6c4.6.1 9.2-.2 13.8 0"/>',
  chest:
    '<path d="M7.6 21.4h32.8V38a2.4 2.4 0 0 1-2.4 2.4H10a2.4 2.4 0 0 1-2.4-2.4z"/><path d="M7.6 21.4C7.4 13.4 14.6 8.6 24 8.6s16.6 4.8 16.4 12.8"/><path d="M7.8 27.2c10.8.3 21.6-.2 32.4 0"/><path d="M21.6 24.6h4.8v6.6h-4.8z"/><path d="M15.6 10.6c.2 3.6 0 7.2.2 10.8M32.4 10.6c-.2 3.6 0 7.2-.2 10.8"/>',
  vine:
    '<path d="M19.4 5.6C14.6 5.8 14.4 9.8 14.4 15s-1.6 8.4-5.2 9c3.6.8 5.2 3.6 5.2 9s.2 9.2 5 9.4"/><path d="M28.6 5.6c4.8.2 5 4.2 5 9.4s1.6 8.4 5.2 9c-3.6.8-5.2 3.6-5.2 9s-.2 9.2-5 9.4"/><path d="M14.4 15c-3.4-1.4-5.8.4-6.2 3 3.2.4 5.2-.8 6.2-3zM33.6 33c3.4 1.4 5.8-.4 6.2-3-3.2-.4-5.2.8-6.2 3z"/><path d="M14.6 33.4c-2.2.2-3.6 1.6-3.8 3.6 2.1-.1 3.3-1.4 3.8-3.6zM33.4 14.6c2.2-.2 3.6-1.6 3.8-3.6-2.1.1-3.3 1.4-3.8 3.6z"/>',
  flower:
    '<path d="M24 44.4c-.6-7.6.6-14.2-.2-21.2"/><path d="M23.8 35.4c-4.4-3.4-8.8-3.2-11.6.4 4.4 1.8 8 1.6 11.6-.4zM24 30.6c3.6-3.6 7.6-4 10.6-1.4-3.4 2.4-7 2.8-10.6 1.4z"/><circle cx="24" cy="15.4" r="3"/><path d="M24 12.4c-2.2-4.6.4-8.2 2.4-6.6 1.8 1.6.6 4.6-2.4 6.6zM26.8 14.2c3.8-3.2 8-2 7.6.6-.4 2.4-3.6 2.8-7.6-.6zM26.2 17.8c4.6 1.4 5.4 5.6 3 6.4-2.2.8-4.2-1.8-3-6.4zM21.8 17.8c-1 4.6-4.2 6.6-5.8 4.6-1.4-1.8.8-4.2 5.8-4.6zM21.2 14.2c-4.4-2.2-5-6.2-2.4-6.8 2.4-.4 3.6 2.6 2.4 6.8z"/>',
  compass:
    '<circle cx="24" cy="24" r="17.6"/><path d="M24 9.6l4.6 14.4L24 38.4l-4.6-14.4z"/><path d="M24 9.6v14.4l4.6 0" fill="currentColor" fill-opacity=".85" stroke="none"/><path d="M24 2.6v3.2M24 42.2v3.2M2.6 24h3.2M42.2 24h3.2"/>',
  stake:
    '<path d="M24 44.6V14.2"/><path d="M24 14.2c4.4 1 8.6 2.6 12.6 4.4-4 1.6-8.2 3-12.6 4"/><path d="M14.2 44.6c6.4-1.4 13.2-1.4 19.6 0"/>',
};

export function inkSpriteMarkup(): string {
  const symbols = [
    ...Object.entries(ui).map(([id, body]) => `<symbol id="ink-${id}" viewBox="0 0 24 24">${body}</symbol>`),
    ...Object.entries(pictos).map(([id, body]) => `<symbol id="picto-${id}" viewBox="0 0 48 48">${body}</symbol>`),
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${symbols}</svg>`;
}

/** corpo SVG (viewBox 24×24) de cada ícone, para desenhar inline */
export const ICON_BODY: Readonly<Record<string, string>> = ui;
export type InkIconName = keyof typeof ui;
export type PictoName = keyof typeof pictos;
export const ICONS = Object.keys(ui);
export const PICTOS = Object.keys(pictos);
