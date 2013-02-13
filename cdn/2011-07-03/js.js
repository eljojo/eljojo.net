/* eljojo.net - por jojo */

//http://remysharp.com/2007/05/18/add-twitter-to-your-blog-step-by-step/
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

jQuery.preLoadImages('http://perfectirijillo.com/eljojo.net/yo/yo4.jpg','http://perfectirijillo.com/eljojo.net/yo/yo3.jpg','http://perfectirijillo.com/eljojo.net/yo/yo5.jpg');

getTwitters('twitter', { 
  id: 'eljojo', 
  count: 1, 
  enableLinks: true, 
  ignoreReplies: true, 
  clearContents: true,
  template: '"%text%" <br /><a href="http://twitter.com/%user_screen_name%/status/%id_str%/">%time%</a>'
});
$(function(){
	  $("#redes a").hover(
      function () {
        $(this).animate({ 'opacity': 1}, 250);
      }, 
      function () {
        $(this).animate({ 'opacity': 0.7}, 250);
      }
    );
	 $("#redes a").animate({ 'opacity': 0.7}, 500);
	yo=6;
	
	$("#yo").click(function(){
		yo=yo-1;
		if(yo<3) yo = 6;
		$(this).attr('src', 'http://perfectirijillo.com/eljojo.net/yo/yo'+yo+'.jpg')
	});
});
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-11834544-6']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();

