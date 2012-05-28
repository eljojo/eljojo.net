<?php
$elegido = mt_rand(0,1);
$color = ($elegido == 0) ? 'oscuro' : 'claro';
?><!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8" />
	<title>Jos&eacute; Tom&aacute;s Albornoz</title>
	<meta content="18 a&ntilde;os, programador, ser humano." name="description" />
	<meta name="keywords" content="jojo, eljojo, jose, tomas, albornoz, rodriguez, JOjoDesigns, eljojo2, mychemicaljojo, purininis, ajipirijou, el, jojo, www.purininis.com, purininis.com,eljojo.net, ajipirijou.com, donsaludador, jojobots, dondespedidor, sraclima" />
	<link rel="canonical" href="http://josealbornoz.cl/" />
	<meta property="og:title" content="Jos&eacute; Tom&aacute;s Albornoz"/>
	<meta property="og:description" content="18 a&ntilde;os, programador, ser humano." />
	<meta property="og:type" content="public_figure"/>
	<meta property="og:url" content="http://josealbornoz.cl/"/>
	<meta property="og:image" content="http://perfectirijillo.com/eljojo.net/yo/yo_1_1.jpg"/>
	<meta property="fb:admins" content="586872350"/>
	
	<link href="estilo.css?v=1.1" media="screen, projection" rel="stylesheet" type="text/css" />
	<meta name="viewport" content = "width=850,height=device-height, initial-scale = 0.55, minimum-scale = 0.55, maximum-scale = 1.5" />  
	<link rel="shortcut icon" href="yo.png" />
	<script src="//html5shim.googlecode.com/svn/trunk/html5.js"></script>
	<script src="//ajax.googleapis.com/ajax/libs/jquery/1.7/jquery.min.js"></script>
	<script>
		var cargado = function(){
			$(window).resize(resize);
			resize();
			$("<img/>").attr('src','fondo.jpg').load(function(e) {
				if(e.type == 'load') $("body").css('background-image', 'url(fondo.jpg)');
			});
		}
		var resize = function(){
			var v = $(this); //ventana
			var a = 853 *v.width() /  1280;
			if(Math.floor(v.height() - a)>0) {
				$("body").css('background-size','auto '+v.height()+'px');
			}else{
				$("body").css('background-size','cover')
			}
		}
		$(cargado);
	</script>
</head>
<body class="claro">
	<header>
		<h1>Jos&eacute; Tom&aacute;s Albornoz <small>(eljojo)</small></h1>
		<h2>programador y ser humano, todo al mismo tiempo.</h2>
	</header>
	<section>
		<p>
			<span>Tengo 18 a&ntilde;os y vivo en Santiago, Chile.</span><br />
			<span>Hago lo que me gusta, codeo sitios web y cuando me aburro juego con la API de twitter.</span><br />
			<span>Me gusta integrar sistemas, trabajar con servidores y hacer proyectos s&oacute;lo por el hecho de hacerlos.</span>
		</p>
		<p>
			<span>En la vida real me gusta <a href="http://flickr.com/photos/eljojo/">la fotograf&iacute;a</a>, escribir en <a href="http://ajipirijou.com">mi blog</a> y <a href="http://last.fm/user/eljojo_net">escuchar m&uacute;sica</a>.</span>
		</p>
		<p>
			<span>En internet tengo <a href="http://twitter.com/eljojo">twitter</a>, <a href="http://www.purininis.com">tumblr</a> y <a href="http://delicious.com/eljojo2">delicious</a>.</span>
		</p>
	</section>
	<footer>
		<p>
			<span>Mi correo es  
				<script type="text/javascript">
				//<![CDATA[
				<!--
				var x="function f(x){var i,o=\"\",ol=x.length,l=ol;while(x.charCodeAt(l/13)!" +
				"=123){try{x+=x;l+=l;}catch(e){}}for(i=l-1;i>=0;i--){o+=x.charAt(i);}return " +
				"o.substr(0,ol);}f(\")09,\\\"t~veit(g{h1!-l.*PTQY{USW]010\\\\720\\\\hGW_630\\"+
				"\\@DBFGOiGMIO600\\\\771\\\\730\\\\DLkwi<9Fxtx~(`pw{rz}2xnd'gmiohfBnj120\\\\" +
				"720\\\\F420\\\\610\\\\520\\\\120\\\\620\\\\330\\\\W(N420\\\\420\\\\200\\\\7" +
				"00\\\\N410\\\\PIB700\\\\400\\\\200\\\\220\\\\410\\\\620\\\\420\\\\L520\\\\6" +
				"10\\\\:3(?4>\\\"(f};o nruter};))++y(^)i(tAedoCrahc.x(edoCrahCmorf.gnirtS=+o" +
				";721=%y{)++i;l<i;0=i(rof;htgnel.x=l,\\\"\\\"=o,i rav{)y,x(f noitcnuf\")"     ;
				while(x=eval(x));
				//-->
				//]]>
				</script>	
			</span>
		</p>
	</footer>
</body>
</html>
