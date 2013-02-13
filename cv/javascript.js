(function($) {
  var cache = [];
  // Arguments are image paths relative to the current page.
  $.preLoadImages = function() {
    var args_len = arguments.length;
    for (var i = args_len; i--;) {
      var cacheImage = document.createElement('img');
      cacheImage.src = arguments[i];
      cache.push(cacheImage);
    }
  }
})(jQuery)
jQuery.preLoadImages("sitios/campos-lopez.jpg", "sitios/eljojo.jpg", "sitios/freesomeday.jpg", "sitios/maulec.jpg");
$(document).ready(function() {
	$("a.foto").fancybox({
		'transitionIn'	:	'elastic',
		'transitionOut'	:	'elastic',
		'overlayShow'	:	false,
		'margin'		: 0,
		'padding':0,
		'modal'			: false,
		'opacity'		: true
	});
	$("a.yt").fancybox({
		'transitionIn'	:	'elastic',
		'transitionOut'	:	'elastic',
		'overlayShow'	:	true,
		'margin'		: 0,
		'padding':		0,
		'modal'			: false,
		'opacity'		: true
	});
});