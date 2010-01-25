/* 
 * (c) arne arnold, January 2010
 * 
 *  v2.5
 *  Respecting the JavaScript global namespace as stated ad
 *  http://blogger.ziesemer.com/2007/10/respecting-javascript-global-namespace.html
 *  
 *  v2.2
 * 	applied patch by gortan
 *  moved max width/max height into preferences
 *  updated image urls as provided by stevelothspeich
 *  allow resizing of pop-up
 *  changed click behavior (forward to page instead of closing pop-up)
 *  added userfriendly comic
 * special thanks to stevelothspeich, and gortan for getting involved!
 */

/********************************************************************
 ************** define namespace for global attributes **************
 *******************************************************************/

if(!de) var de={};
if(!de.arnoldmedia) de.arnoldmedia={};

// begin namespace package 
de.arnoldmedia.myPackage = function(){
	
	var pub = {};

	/********************************************************************
	 ************** global attributes source configuration **************
	 *******************************************************************/
	
	// const - prefix for preferences and properties
	pub.dailyDilbertPrefix = 'extensions.daily_dilbert.';
	
	// url for popup template
	pub.popupComicChromeURL = 'chrome://daily_dilbert/content/comic.html';
	
	// url of properties file
	pub.dailyDilbertPropURL = 'chrome://daily_dilbert/locale/daily_dilbert.properties';
	
	// picture not found url
	pub.dailyDilbertNotFoundURL = 'chrome://daily_dilbert/skin/no-picture.png';
	
	// popup window title
	pub.popupComicTitle = 'Strip of the day';
	pub.popupComicProperties = 'scrollbars,chrome=no,resizable=yes';
	
	// max img dimensions window is resized to 
	// will be initialized by properties (see line ~240)
	pub.maxImageWidth = 0;
	pub.maxImageHeight = 0;
			
	// status bar icon
	pub.dailyDilbertIcon = false;
	
	// status of (event handler) initialization
	pub.dailyDilbertInitialized = false;
	
	// log writer
	pub.dailyDilbertLogger = false;
	
	// localized string factory
	pub.dailyDilbertLocalizer = false;
	
	// preference DAO
	pub.dailyDilbertPreferences = false;
	
	// pointer to popup window containing comic strip
	pub.popupComicWindow = null;
	
	// pointer to image and div tag containing comic strip
	pub.popupComicImageObj = null;
	pub.popupComicDivObj = null;
	pub.popupComicAnchorObj = null;
	
	// popup comic strips
	pub.popupComicSites = new Array();
	
	// max comics in array
	pub.popupComicCount = 0;
	
	// current selected comic
	pub.popupComicCurrent = 0;
	
	// http_request handler
	pub.http_request = false;
	
	/********************************************************************
	 * global event handler 											*
	 * 																	*
	 * @public
	 * listen for changes to preferences and reinitializing variables	*
	 * or properties of XUL components, see								*
	 * http://developer.mozilla.org/en/docs/Code_snippets:Preferences 	*
	 ********************************************************************/
	pub.dailyDilbertPrefObserver = {
		register : function() {
			var prefService = Components.classes['@mozilla.org/preferences-service;1']
					.getService(Components.interfaces.nsIPrefService);
			this._branch = prefService.getBranch(pub.dailyDilbertPrefix);
			this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
			this._branch.addObserver('', this, false);
		},
	
		unregister : function() {
			if (!this._branch)
				return;
			this._branch.removeObserver('', this);
		},
	
		observe : function(aSubject, aTopic, aData) {
			// aTopic is the event which has been occurred
			// aSubject is the nsIPrefBranch we're observing (after appropriate QI)
			// aData is the name of the preference that's been changed (relative to
			// aSubject)
			if (aTopic != 'nsPref:changed')
				return;
			switch (aData) {
				case 'comic.site.count' :
				case 'comic.site.current' :
					loadDailyDilbertPreferences();
					break;
			}// switch
		}// observe
	}// dailyDilbertPrefObserver
	
	
	/********************************************************************
	 ************************ business logic ****************************
	 *******************************************************************/
	
	/********************************************************************
	 * initDailyDilbert()												*
	 * 																	*
	 * @private 
	 * @depends pub.dailyDilbertInitialized, pub.dailyDilbertLogger, pub.dailyDilbertLocalizer, pub.dailyDilbertPreferences, pub.dailyDilbertIcon
	 * Initialize Main component, including Log, I18N and Pref Support	*
	 * Called by onLoad() event hanlder of daily_dilbert.xul			*
	 ********************************************************************/
	function initDailyDilbert() {
	
		logger(5, 'initDailyDilbert', 'generic.entermethod', 'enter method');
	
		// check if components has already been initialized
		if (pub.dailyDilbertInitialized) {
			logger(2, 'initDailyDilbert',
					'initDailyDilbert.initialized',
					'DailyDilbert event handlers has already been initialized');
			return;
		}//if
	
		// initialize log writer
		if (!pub.dailyDilbertLogger) {
	
			try {
				var logMngr = Components.classes['@mozmonkey.com/debuglogger/manager;1']
						.getService(Components.interfaces.nsIDebugLoggerManager);
				pub.dailyDilbertLogger = logMngr.registerLogger('daily_dilbert');
			} catch (exErr) {
				pub.dailyDilbertLogger = false;
			}// try
	
			// check status of dailyDilbertLogger
			if (pub.dailyDilbertLogger) {
				loggerNG(4, 'initDailyDilbert', 'generic.initiate.ok', ['dailyDilbertLogger'], 'dailyDilbertLogger initiated');
			} else {
				loggerNG(1, 'initDailyDilbert', 'generic.initiate.failed', ['dailyDilbertLogger'],
						'dailyDilbertLogger could not be initiated');
			}// if
		}// if
	
		// load localization strings
		if (!pub.dailyDilbertLocalizer) {
	
			try {
				var oBundle = Components.classes['@mozilla.org/intl/stringbundle;1']
						.getService(Components.interfaces.nsIStringBundleService);
				pub.dailyDilbertLocalizer = oBundle.createBundle(dailyDilbertPropURL);
			} catch (err) {
				pub.dailyDilbertLocalizer = false;
			}// try
	
			// check status of dailyDilbertLocalizer
			if (pub.dailyDilbertLocalizer) {
				loggerNG(4, 'initDailyDilbert', 'generic.initiate.ok', ['dailyDilbertLocalizer'], 'dailyDilbertLocalizer initiated');
			} else {
				loggerNG(1, 'initDailyDilbert', 'generic.initiate.failed', ['dailyDilbertLocalizer'],
						'dailyDilbertLocalizer could not be initiated');
			}// if
		}// if
	
		// load preferences
		if (!pub.dailyDilbertPreferences) {
	
			try {
				// register Preference Reader
				pub.initDailyDilbertPreferences();
			} catch (err) {
				loggerNG(1, 'initDailyDilbert', 'generic.initiate.failed', ['dailyDilbertPreferences'],
						'dailyDilbertPreferences could not be initiated');
				pub.dailyDilbertPreferences = false;
			}// try
	
			// check status of dailyDilbertPreferences
			if (pub.dailyDilbertPreferences) {
	
				// load Preferences into memory
				pub.loadDailyDilbertPreferences();
	
				// listen to update of preferences
				pub.dailyDilbertPrefObserver.register();
				loggerNG(4, 'initDailyDilbert', 'generic.initiate.ok', ['dailyDilbertPreferences'], 'dailyDilbertPreferences initiated');
			}// if
		}// if
	
	
		// get dilbert icon  handler
	    if ( !pub.dailyDilbertIcon && document.getElementById('daily_dilbert-panel') ) {
	    	pub.dailyDilbertIcon = document.getElementById('daily_dilbert-panel');
	    }// if
		
	    pub.dailyDilbertInitialized = true;
		loggerNG(3, 'initDailyDilbert', 'generic.initiate.ok', ['initDailyDilbert'], 'initDailyDilbert initiated');
		logger(5, 'initDailyDilbert', 'generic.leavemethod', 'leave method');
	
	}// initDailyDilbert
	
	/********************************************************************
	 * initDailyDilbertPreferences										*
	 * 																	*
	 * @private
	 * @depends pub.dailyDilbertPreferences
	 * get handler to XUL preference store								*
	 * called by initDailyDilbert()										*
	 *******************************************************************/
	function initDailyDilbertPreferences() {
	
		// register Preference Reader
		var prefService = Components.classes['@mozilla.org/preferences-service;1']
				.getService(Components.interfaces.nsIPrefService);
		pub.dailyDilbertPreferences = prefService.getBranch(dailyDilbertPrefix);
	
	}// initDailyDilbertPreferences
	
	/********************************************************************
	 * loadDailyDilbertPreferences										*
	 * 																	*
	 * @private
	 * @depends pub.maxImageWidth, pub.dailyDilbertPreferences, pub.maxImageHeight, pub.popupComicCount, pub.popupComicCurrent, pub.popupComicSites
	 * load preferences from XUL persistence into memory				*
	 * called by dailyDilbertPrefObserver() and initDailyDilbert()		*
	 *******************************************************************/
	function loadDailyDilbertPreferences() {
	
		logger(5, 'loadDailyDilbertPreferences', 'generic.entermethod', 'enter method');
	
		if (!pub.dailyDilbertPreferences) {
			logger(1, 'loadDailyDilbertPreferences',
					'dailyDilbertPreferences.isnull',
					'dailyDilbertPreferences DAO is undefined');
			return;
		}// if
	
		var prefKey = '';
		try {
			
			// set max img dimensions window is resized to 
			pub.maxImageWidth = pub.dailyDilbertPreferences
				.getIntPref('popup.width.max');
			pub.maxImageHeight = pub.dailyDilbertPreferences
				.getIntPref('popup.height.max');
	
			// set max and current comic index
			pub.popupComicCount = pub.dailyDilbertPreferences
					.getIntPref('comic.site.count');
			pub.popupComicCurrent = pub.dailyDilbertPreferences
					.getIntPref('comic.site.current');
	
			// load array of comics 
			for (var i = 0; i < pub.popupComicCount; i++) {
				pub.popupComicSites[i] = pub.dailyDilbertPreferences
						.getCharPref('comic.site.' + i).split('$$');
			}// for
	
		} catch (err) {
			loggerNG(1, 'loadDailyDilbertPreferences', 'extensions.daily_dilbert.generic.exception', [err], 'Exception occurred. Original message was: '+ err);
		} // try
	
		logger(5, 'loadDailyDilbertPreferences', 'generic.leavemethod', 'leave method');
	
	}// loadDailyDilbertPreferences
	
	
	/********************************************************************
	 * showDailyDilbert()												*
	 * 																	*
	 * @public
	 * called by daily_dilbert.xul
	 * @depends pub.popupComicCurrent, pub.popupComicSites, pub.http_request,pub.popupComicChromeURL, pub.popupComicTitle, pub.popupComicProperties
	 * This is the MAIN METHOD of the plug-in which will be execute then*
	 * the user left-clicks on the dilbert icon in the status bar		*
	 * Method then invoke HTTP request client and register 				*
	 * openPopupComic() as call back function which is executed after	*
	 * HTTP content is completely returned 								*
	 ********************************************************************/
	pub.showDailyDilbert = function() {
	
		logger(5, 'showDailyDilbert', 'generic.entermethod', 'enter method');
	
		if (!(pub.popupComicCurrent >= 0))
			pub.popupComicCurrent = 0;
	
	//	document.body.style = 'cursor: wait';
	
		//	if(popupComicWindow == null || popupComicWindow.closed) {
	//		popupComicWindow = window.openDialog(popupComicChromeURL + '?imgSrc=chrome://daily_dilbert/skin/wait.gif',
	//			popupComicTitle, popupComicProperties); 
	//	} else if(previousUrl != strUrl) {
	//		popupComicWindow.focus();
	//	} else {
	//		popupComicWindow.focus();
	//  	}
	
	  	// check what kind of pattern mode we have
		// array of four elements -> regular expression is used to determine url of image
		if (pub.popupComicSites[pub.popupComicCurrent].length == 4) {
			
			pub.http_request = false;
			pub.http_request = new XMLHttpRequest();
		
			if (pub.http_request.overrideMimeType) {
				//http_request.overrideMimeType('text/xml');
				pub.http_request.overrideMimeType('text/html');
			}// if
		
			if (!pub.http_request) {
				logger(1, 'showDailyDilbert', 'showDailyDilbert.httprequest.isnull', 'Cannot create XML/HTTP instance');
				return;
			}// if
		
			pub.http_request.onreadystatechange = openPopupComic;
			pub.http_request.open('GET', pub.popupComicSites[popupComicCurrent][1] + pub.popupComicSites[popupComicCurrent][2], true);
			pub.http_request.send(null);
	
		// array of three elements -> image is specified via time stamp
		} else if (pub.popupComicSites[popupComicCurrent].length == 2) {
			
			logger(3, 'openPopupComic', 'openPopupComic.imageurl.bytimesamp', 'Entering timestamp mode for URL determination');
						
			var curDate = new Date();
			var curMonth = ((curDate.getMonth()+1) < 10) ? "0" + (curDate.getMonth()+ 1) : (curDate.getMonth()+ 1);
			var curDay = (curDate.getDate() < 10) ? "0" + curDate.getDate() : curDate.getDate();
			var curYear = curDate.getFullYear();
			var curYearShort = Right(curYear, 2);
	
			var imgurl = pub.popupComicSites[popupComicCurrent][1];
			imgurl = imgurl.replace(/\<YYYY\>/g, curYear);
			imgurl = imgurl.replace(/\<YY\>/g, curYearShort);
			imgurl = imgurl.replace(/\<MM\>/g, curMonth);
			imgurl = imgurl.replace(/\<DD\>/g, curDay);
			
			// open window and append URL of comic as query string
			loggerNG(4, 'showDailyDilbert', 'openPopupComic.openwindow', [imgurl],
				'Open window for '+ imgurl);
			pub.popupComicWindow = window.openDialog(pub.popupComicChromeURL + '?imgSrc=' + imgurl,
					pub.popupComicTitle, pub.popupComicProperties); 
			pub.popupComicWindow.focus();
			
		} else {
			
			loggerNG(1, 'showDailyDilbert', 'openPopupComic.image.notfound', [pub.popupComicSites[popupComicCurrent][1] + pub.popupComicSites[popupComicCurrent][2]],
				'No comic found at '+ pub.popupComicSites[popupComicCurrent][1] + pub.popupComicSites[popupComicCurrent][2]);
			pub.popupComicWindow = window.openDialog(pub.popupComicChromeURL + '?imgSrc=chrome://daily_dilbert/skin/no-picture.png',
					pub.popupComicTitle, pub.popupComicProperties); 
			
		} // if liste != null
	
		logger(5, 'showDailyDilbert', 'generic.leavemethod', 'leave method');
	
	}// showDailyDilbert
	
	/********************************************************************
	 * openPopupComic()													*
	 * 																	*
	 * @private
	 * @depends pub.popupComicChromeURL, pub.popupComicTitle, pub.popupComicProperties, pub.popupComicWindow, pub.http_request, pub.popupComicSites, pub.dailyDilbertNotFoundURL
	 * method opens comic strip in new window after parsing the			*
	 * specified / configured page. 									*
	 * registered as call back function by showDailyDilbert()			*
	 *******************************************************************/
	function openPopupComic() {
	
		if (pub.http_request.readyState == 4) {
	
	        var imgurl = '';
	
			if (pub.http_request.status == 200) {
	
				// read external site
				var pagesource = pub.http_request.responseText;
	
				logger(3, 'openPopupComic', 'openPopupComic.imageurl.byregexpr', 'Entering regexpr mode for URL determination');
	
				// parse for comics
				var regexpr = new RegExp(pub.popupComicSites[popupComicCurrent][3], 'g');
				var liste = pagesource.match(regexpr);
	
				// check for result array (containing the url)
				if (liste) {
	
					// be fault tolerant - if multiple matches occur, use the first match
					if (liste.length == 1) {
						imgurl = pub.popupComicSites[popupComicCurrent][1] + liste;
					} else if (liste.length > 1) {
						imgurl = pub.popupComicSites[popupComicCurrent][1] + liste[0];
					}// if
	
				} // if liste != null
	
				if ( imgurl == '' ) {
					loggerNG(1, 'openPopupComic', 'openPopupComic.image.notfound', [pub.popupComicSites[popupComicCurrent][1] + pub.popupComicSites[popupComicCurrent][2]],
						'No comic found at '+ pub.popupComicSites[popupComicCurrent][1] + pub.popupComicSites[popupComicCurrent][2]);
					imgurl = pub.dailyDilbertNotFoundURL;
				}// if
	
			} else { // http_request.status != 200
				
				loggerNG(1, 'openPopupComic', 'openPopupComic.http_request.failed', [pub.http_request.status],
						'There was a problem with the request: '+ pub.http_request.status);
	            imgurl = pub.dailyDilbertNotFoundURL;
	
			}// if status == 200
	
	        // open window and append URL of comic as query string
	        loggerNG(4, 'openPopupComic', 'openPopupComic.openwindow', [imgurl],
	                 'Open window for '+ imgurl);
	
	        popupComicWindow = window.openDialog
	            (pub.popupComicChromeURL + '?imgSrc=' + imgurl,
	            		pub.popupComicTitle, pub.popupComicProperties);
	        pub.popupComicWindow.focus();
	
		}// if readyState == 4
	
	}// openPopupComic
	
	/********************************************************************
	 * initPopupComic()													*
	 * 																	*
	 * @public
	 * called by comic.html
	 * @depends pub.popupComicImageObj, pub.popupComicDivObj, pub.popupComicAnchorObj, pub.popupComicCurrent, pub.popupComicSites
	 * method extracts image url from query string and load image 		*
	 * dynamically into HTML, see http://forums.mozillazine.org/		*
	 * viewtopic.php?p=185730&sid=1d3d8001ed90bb9b208e5553a02e83c0		*
	 * Called by onLoad() event hanlder of comic.xul					*
	 *******************************************************************/
	pub.initPopupComic = function() {
	
		// initialize all services if called within popup (comic.xul)
		initDailyDilbert();
		
		logger(5, 'initPopupComic', 'generic.entermethod', 'enter method');
	
		// get handler
		pub.popupComicImageObj = document.getElementById('comicimg');
		pub.popupComicDivObj = document.getElementById('comicdiv');
		pub.popupComicAnchorObj = document.getElementById('comichref');
	
		// set properties for image element
		if (pub.popupComicImageObj && pub.popupComicAnchorObj) {
			pub.popupComicImageObj.addEventListener('load', resizePopupComic, false);
			pub.popupComicImageObj.src = getQueryArg('imgSrc');
			pub.popupComicImageObj.title = '(c) '+ pub.popupComicSites[pub.popupComicCurrent][1] + pub.popupComicSites[popupComicCurrent][2];
			pub.popupComicAnchorObj.href = pub.popupComicSites[pub.popupComicCurrent][1] + pub.popupComicSites[popupComicCurrent][2];
			//popupComicAnchorObj.target = '_blank';
			
		} else {
			logger(1, 'initPopupComic',
					'initPopupComic.isnull',
					'Image can not be displayed due to missing image object in DOM');
		}// if
	
		// add available options to select-bar
		var popupComicSelect = document.getElementById('comicselect');
		for (var j=0; j < pub.popupComicCount; j++) {
			popupComicSelect.options[j] = new Option(pub.popupComicSites[j][0],j);
		}// for
		
		// make current comic to be selected
		popupComicSelect.selectedIndex = pub.popupComicCurrent;
		
		logger(5, 'initPopupComic', 'generic.leavemethod', 'leave method');
	
	}// initPopupComic
	
	/********************************************************************
	 * resizePopupComic()													*
	 * 																	*
	 * @private
	 * @depends pub.popupComicImageObj, pub.maxImageWidth, pub.maxImageHeight
	 * resize popup window to fit image width/height 					*
	 * called by initPopupComic()										*
	 *******************************************************************/
	function resizePopupComic() {
	
		logger(5, 'resizePopupComic', 'generic.entermethod', 'enter method');
	
		if (pub.popupComicImageObj) {
			
			// retrieve image dimensions
			var imageWidth = pub.popupComicImageObj.width;
			var imageHeight = pub.popupComicImageObj.height;
			
			// limit size of window
			if ( imageWidth > pub.maxImageWidth ) {
				imageHeight = imageHeight * (pub.maxImageWidth/imageWidth);
				imageWidth = pub.maxImageWidth;
			}// if
			if ( imageHeight > pub.maxImageHeight ) {
				imageWidth = imageWidth * (pub.maxImageHeight/imageHeight);
				imageHeight = pub.maxImageHeight;
			}// if
			
			// add 18 pixels to with and height for boundaries
			// add 20 pixels to height for title bar
			// add 35 pixels to height for select field		
			window.resizeTo(imageWidth + 18, imageHeight +18 + 20 +35);
	
			// center window  
			//var newx = (screen.availWidth / 2) - (imageWidth / 2);
			//var newy = (screen.availHeight / 2) - (imageHeight / 2);
			//window.moveTo(newx, newy);
		} else {
			logger(1, 'resizePopupComic',
					'resizePopupComic.isnull',
					'Window can not be resized due to missing object');
		}// if
	
		logger(5, 'resizePopupComic', 'generic.leavemethod', 'leave method');
	
	}// resizePopupComic
	
	/********************************************************************
	 ************************* helper functions *************************
	 *******************************************************************/
	
	/**
	 * @private
	 * @depends pub.dailyDilbertLocalizer, pub.dailyDilbertPrefix, pub.dailyDilbertIcon, pub.dailyDilbertLogger
	 * loglevel 1 is most generic and 5 is the most specific ERROR, WARNING, INFO,
	 * DEBUG, VERBOSE thanks to https://addons.mozilla.org/de/firefox/addon/3983
	 */
	function logger(nLevel, sContext, msgID, altMsg) {
	
		var logLevels = new Array('ERROR', 'WARNING', 'INFO', 'DEBUG', 'VERBOSE');
		var rDate = new Date();
		var lLvl = nLevel;
		var sMsg = altMsg;
	
		if (lLvl < 1) {
			lLvl = 1;
		} else if (lLvl > 5) {
			lLvl = 5;
		}// if
	
		if (msgID != '' && pub.dailyDilbertLocalizer) {
			try {
				sMsg = pub.dailyDilbertLocalizer.GetStringFromName(pub.dailyDilbertPrefix + msgID);
			} catch (err) {
				logger(1, 'logger', '', 'Exception occurred. Original message was: '+ err );
			}// try
		}// if
	
		sMsg = rDate.toLocaleString() + ': ' + logLevels[lLvl - 1] + ' ('
				+ sContext + '): ' + sMsg;
	
		if (pub.dailyDilbertLogger) {
			pub.dailyDilbertLogger.log(lLvl, sMsg);
		} else {
			dump(sMsg);
		}// if
	
		//if (dailyDilbertIcon) {
		if ( lLvl == 1 && pub.dailyDilbertIcon ) {
			pub.dailyDilbertIcon.setAttribute('ddstatus', 'error');
			pub.dailyDilbertIcon.setAttribute('tooltiptext', sMsg);
		}// if
	}// logger
	
	/**
	 * @private
	 * @depends pub.dailyDilbertLocalizer, pub.dailyDilbertPrefix
	 * wrapper for default logger method to support substitutes
	 */
	function loggerNG(nLevel, sContext, msgID, subs, altMsgm) {
	
		var sMsg = altMsgm;
		
		if (msgID != '' && pub.dailyDilbertLocalizer) {
			try {
				sMsg = pub.dailyDilbertLocalizer.formatStringFromName(pub.dailyDilbertPrefix + msgID, subs, subs.length);
			} catch (err) {
				logger(1, 'loggerNG', '', 'Exception occurred. Original message was: '+ err);
			}// try
		}// if
	
		logger(nLevel, sContext, '', sMsg);
		
	}// loggerG
	
	/*******************************************************************************
	 * @private
	 * use parseQuery-method on current window and return value for specified query
	 * parameter
	 */
	function getQueryArg(key) {
		var queryString = new String(window.location).replace(/^[^\?]+\??/, '');
		var args = parseQuery(queryString);
		return args[key];
	}// getQueryArg
	
	/**
	 * @private
	 * parse the query string into an associative array Object by breaking key=value
	 * pairs out on the semi-colon (;) or ampersand1 (&), and then splitting them
	 * apart on the equals (=). Many thanks to
	 * http://feather.elektrum.org/book/src.html
	 */
	function parseQuery(query) {
	
		var Params = new Object();
		if (!query)
			return Params; // return empty object
		var Pairs = query.split(/[;&]/);
	
		for (var i = 0; i < Pairs.length; i++) {
			var KeyVal = Pairs[i].split('=');
			if (!KeyVal || KeyVal.length != 2)
				continue;
			var key = unescape(KeyVal[0]);
			var val = unescape(KeyVal[1]);
			val = val.replace(/\+/g, ' ');
			Params[key] = val;
		}// for
	
		return Params;
	
	}// parseQuery
	
	/**
	 * @private
	 * http://www.devx.com/tips/Tip/15222
	 */
	function Left(str, n){
		if (n <= 0)
		    return "";
		else if (n > String(str).length)
		    return str;
		else
		    return String(str).substring(0,n);
	}//Left
	
	/**
	 * @private
	 * http://www.devx.com/tips/Tip/15222
	 */
	function Right(str, n){
	    if (n <= 0)
	       return "";
	    else if (n > String(str).length)
	       return str;
	    else {
	       var iLen = String(str).length;
	       return String(str).substring(iLen, iLen - n);
	    }// if
	}// Right


/********************************************************************
 ************** close namespace for global attributes **************
 *******************************************************************/

// close namespace package 
	return pub;
}();


/********************************************************************
 ************** global helper function with attribute **************
 *******************************************************************/

/********************************************************************
 * saveCurrentPopupComic()											*
 * 																	*
 * @public
 * @depends pub.popupComicCurrent, pub.dailyDilbertPreferences
 * read curent selected item and save value to preferences			*
 *******************************************************************/
function changePopupComicCurrent(value) {

	de.arnoldmedia.myPackage.logger(5, 'changePopupComicCurrent', 'generic.entermethod', 'enter method');

	de.arnoldmedia.myPackage.popupComicCurrent = value*1;
	
	de.arnoldmedia.myPackage.dailyDilbertPreferences.setIntPref('comic.site.current', de.arnoldmedia.myPackage.popupComicCurrent );
	
	de.arnoldmedia.myPackage.showDailyDilbert();
	
	de.arnoldmedia.myPackage.logger(5, 'changePopupComicCurrent', 'generic.leavemethod', 'leave method');

}// saveCurrentPopupComic