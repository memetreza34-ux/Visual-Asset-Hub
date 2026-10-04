// Wird per `node --import` geladen und ersetzt fetch für den Real-Media-CLI-Test (kein Netzwerk).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);

function page({ pageid, index, title, license, licenseUrl, mime = 'image/jpeg', width = 4000, height = 3000 }) {
  const file = title.replace(/ /g, '_');
  return {
    pageid,
    index,
    title: `File:${title}`,
    imageinfo: [{
      url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/${file}`,
      descriptionurl: `https://commons.wikimedia.org/wiki/File:${file}`,
      mime,
      width,
      height,
      size: 2_000_000,
      thumburl: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/${file}/1920px-${file}`,
      thumbwidth: 1920,
      thumbheight: Math.round((1920 * height) / width),
      extmetadata: {
        LicenseShortName: { value: license },
        LicenseUrl: { value: licenseUrl },
        Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Tester">Tester</a>' }
      }
    }]
  };
}

globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  if (url.hostname === 'commons.wikimedia.org') {
    return Response.json({
      query: {
        pages: [
          page({ pageid: 3, index: 1, title: 'Nokia N95 restricted.jpg', license: 'CC BY-NC 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc/2.0' }),
          page({ pageid: 4, index: 2, title: 'Random building.jpg', license: 'CC0', licenseUrl: '' }),
          page({ pageid: 5, index: 3, title: 'Nokia N95 front.jpg', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0' })
        ]
      }
    });
  }
  if (url.hostname === 'upload.wikimedia.org') {
    return new Response(JPEG, { headers: { 'content-type': 'image/jpeg', 'content-length': String(JPEG.length) } });
  }
  throw new Error(`Unerwarteter Netzwerkzugriff im Test: ${url}`);
};
