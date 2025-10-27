// GitHub 데모용 리다이렉트 (example → example/bundle)
// GitHub 호스팅된 데모에서만 동작
const url = new URL(location.href);
const tokens = url.pathname.split(/[\\/]/g);
const filename = tokens.pop();
const parentDirectory = tokens[ tokens.length - 1 ];
if (url.origin.includes('github') && parentDirectory !== 'bundle') {
    url.pathname = tokens.join('/') + '/';
    window.location.replace(new URL('bundle/' + filename, url.toString()));
}
