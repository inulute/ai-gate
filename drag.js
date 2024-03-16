
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

document.addEventListener('selectstart', function (e) {
    e.preventDefault();
});


document.addEventListener('dragstart', function (e) {
    if (e.target.nodeName === 'A' && e.target.hasAttribute('href')) {
        e.preventDefault();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    document.body.style.cursor = "default";
});