/*
 * (c) arne arnold, march 2008
 */

/********************************************************************
 ************** global attributes source configuration **************
 *******************************************************************/

// const - prefix for preferences and properties
const dailyDilbertPrefix = 'extensions.daily_dilbert.';

// url for popup template
const popupComicChromeURL = 'chrome://daily_dilbert/content/comic.html';

// url of proprties file
const dailyDilbertPropURL = 'chrome://daily_dilbert/locale/daily_dilbert.properties'

// statusbar icon
var dailyDilbertIcon = false;

// status of (eventhandler) initialization
var dailyDilbertInitialized = false;

// log writer
var dailyDilbertLogger = false;

// localized string factory
var dailyDilbertLocalizer = false;

// preference DAO
var dailyDilbertPreferences = false;

// pointer to popup window containing comic strip
var popupComicWindow = null;

// pointer to image and div tag containing comic strip
var popupComicImageObj = null;
var popupComicDivObj = null;

// popup comic strips
var popupComicSites = new Array();

// max comics in array
var popupComicCount = 0;

// current selected comic
var popupComicCurrent = 0;

/********************************************************************
 * global event handler 											*
 * 																	*
 * listen for changes to preferences and reinitializing variables	*
 * or properties of XUL components, see								*
 * http://developer.mozilla.org/en/docs/Code_snippets:Preferences 	*
 ********************************************************************/
var dailyDilbertPrefObserver = {
	register : function() {
		var prefService = Components.classes['@mozilla.org/preferences-service;1']
				.getService(Components.interfaces.nsIPrefService);
		this._branch = prefService.getBranch(dailyDilbertPrefix);
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
		// aData is the name of the pref that's been changed (relative to
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
 * Initialize Main component, including Log, I18N and Pref Suport	*
 * Called by onLoad() eventhanlder of daily_dilbert.xul				*
 ********************************************************************/
function initDailyDilbert() {

	logger(5, 'initDailyDilbert', 'generic.entermethod', 'enter method');

	// check if components has already been initialized
	if (dailyDilbertInitialized) {
		logger(2, 'initDailyDilbert',
				'initDailyDilbert.initialized',
				'DailyDilbert event handlers has already been initialized');
		return;
	}//if

	// initialize log writer
	if (!dailyDilbertLogger) {

		try {
			var logMngr = Components.classes['@mozmonkey.com/debuglogger/manager;1']
					.getService(Components.interfaces.nsIDebugLoggerManager);
			dailyDilbertLogger = logMngr.registerLogger('daily_dilbert');
		} catch (exErr) {
			dailyDilbertLogger = false;
		}// try

		// check status of dailyDilbertLogger
		if (dailyDilbertLogger) {
			loggerNG(4, 'initDailyDilbert', 'generic.initiate.ok', ['dailyDilbertLogger'], 'dailyDilbertLogger initiated');
		} else {
			loggerNG(1, 'initDailyDilbert', 'generic.initiate.failed', ['dailyDilbertLogger'],
					'dailyDilbertLogger could not be initiated');
		}// if
	}// if

	// load localization strings
	if (!dailyDilbertLocalizer) {

		try {
			var oBundle = Components.classes['@mozilla.org/intl/stringbundle;1']
					.getService(Components.interfaces.nsIStringBundleService);
			dailyDilbertLocalizer = oBundle.createBundle(dailyDilbertPropURL);
		} catch (err) {
			dailyDilbertLocalizer = false;
		}// try

		// check status of dailyDilbertLocalizer
		if (dailyDilbertLocalizer) {
			loggerNG(4, 'initDailyDilbert', 'generic.initiate.ok', ['dailyDilbertLocalizer'], 'dailyDilbertLocalizer initiated');
		} else {
			loggerNG(1, 'initDailyDilbert', 'generic.initiate.failed', ['dailyDilbertLocalizer'],
					'dailyDilbertLocalizer could not be initiated');
		}// if
	}// if

	// load preferences
	if (!dailyDilbertPreferences) {

		try {
			// register Preference Reader
			initDailyDilbertPreferences();
		} catch (err) {
			loggerNG(1, 'initDailyDilbert', 'generic.initiate.failed', ['dailyDilbertPreferences'],
					'dailyDilbertPreferences could not be initiated');
			dailyDilbertPreferences = false;
		}// try

		// check status of dailyDilbertPreferences
		if (dailyDilbertPreferences) {

			// load Preferences into memory
			loadDailyDilbertPreferences();

			// listen to update of preferences
			dailyDilbertPrefObserver.register();
			loggerNG(4, 'initDailyDilbert', 'generic.initiate.ok', ['dailyDilbertPreferences'], 'dailyDilbertPreferences initiated');
		}// if
	}// if


	// get dilbert icon  handler
    if ( !dailyDilbertIcon && document.getElementById('daily_dilbert-panel') ) {
        dailyDilbertIcon = document.getElementById('daily_dilbert-panel');
    }// if
	
	dailyDilbertInitialized = true;
	loggerNG(3, 'initDailyDilbert', 'generic.initiate.ok', ['initDailyDilbert'], 'initDailyDilbert initiated');
	logger(5, 'initDailyDilbert', 'generic.leavemethod', 'leave method');

}// initDailyDilbert

/********************************************************************
 * initDailyDilbertPreferences										*
 * 																	*
 * get handler to XUL preference store								*
 * called by initDailyDilbert()										*
 *******************************************************************/
function initDailyDilbertPreferences() {

	// register Preference Reader
	var prefService = Components.classes['@mozilla.org/preferences-service;1']
			.getService(Components.interfaces.nsIPrefService);
	dailyDilbertPreferences = prefService.getBranch(dailyDilbertPrefix);

}// initDailyDilbertPreferences

/********************************************************************
 * loadDailyDilbertPreferences										*
 * 																	*
 * load preferences from XUL persitence into memory					*
 * called by dailyDilbertPrefObserver() and initDailyDilbert()		*
 *******************************************************************/
function loadDailyDilbertPreferences() {

	logger(5, 'loadDailyDilbertPreferences', 'generic.entermethod', 'enter method');

	if (!dailyDilbertPreferences) {
		logger(1, 'loadDailyDilbertPreferences',
				'dailyDilbertPreferences.isnull',
				'dailyDilbertPreferences DAO is undefined');
		return;
	}// if

	var prefKey = '';
	try {

		popupComicCount = dailyDilbertPreferences
				.getIntPref('comic.site.count');
		popupComicCurrent = dailyDilbertPreferences
				.getIntPref('comic.site.current');

		for (var i = 0; i < popupComicCount; i++) {
			popupComicSites[i] = dailyDilbertPreferences
					.getCharPref('comic.site.' + i).split('$$');
		}// for

	} catch (err) {
		loggerNG(1, 'loadDailyDilbertPreferences', 'extensions.daily_dilbert.generic.exception', [err], 'Exception occurred. Original message was: '+ err);
	} // try

	logger(5, 'loadDailyDilbertPreferences', 'generic.leavemethod', 'leave method');

}// loadDailyDilbertPreferences




/********************************************************************
 * showDailyDilbert()													*
 * 																	*
 * This is the MAIN METHOD of the plugin which will be execute then *
 * the user left-clicks on the dilbert icon in the statusbar		*
 * Method then invoke HTTP request client and register 				*
 * openPopupComic() as call back function which is executed after	*
 * HTTP content is completly returned 								*
 ********************************************************************/
function showDailyDilbert() {

	logger(5, 'showDailyDilbert', 'generic.entermethod', 'enter method');

	if (!(popupComicCurrent >= 0))
		popupComicCurrent = 0;

	http_request = false;
	http_request = new XMLHttpRequest();

	if (http_request.overrideMimeType) {
		http_request.overrideMimeType('text/xml');
	}// if

	if (!http_request) {
		logger(1, 'showDailyDilbert', 'showDailyDilbert.httprequest.isnull', 'Cannot create XML/HTTP instance');
		return;
	}// if

	http_request.onreadystatechange = openPopupComic;
	http_request.open('GET', popupComicSites[popupComicCurrent][1]
			+ popupComicSites[popupComicCurrent][2], true);
	http_request.send(null);

	logger(5, 'showDailyDilbert', 'generic.leavemethod', 'leave method');

}// showDailyDilbert

/********************************************************************
 * openPopupComic()													*
 * 																	*
 * method opens comic strip in new window after parsing the			*
 * specified / configured page. 									*
 * registered as callback function by showDailyDilbert()			*
 *******************************************************************/
function openPopupComic() {

//	loggin disabled as method is called within loop when waiting for
//	http-response to be finished -> spam log!	
//	logger(5, 'openPopupComic', 'generic.entermethod', 'enter method');

	if (http_request.readyState == 4) {

		if (http_request.status == 200) {

			// read external site
			var pagesource = http_request.responseText;

			var imgurl = '';
							
			// check what kind of pattern mode we have
			// array of two elements -> image is specified via timestamp
			// array of four elements -> regular expression is used to determine url of image
			if (popupComicSites[popupComicCurrent].length == 2) {
				
				logger(3, 'openPopupComic', 'openPopupComic.imageurl.bytimesamp', 'Entering timestamp mode for URL determination');
							
				var curDate = new Date();
				var curMonth = ((curDate.getMonth()+1) < 10) ? "0" + (curDate.getMonth()+ 1) : (curDate.getMonth()+ 1);
				var curDay = (curDate.getDate() < 10) ? "0" + curDate.getDate() : curDate.getDate();
				var curYear = curDate.getFullYear();

				imgurl = popupComicSites[popupComicCurrent][1];
				imgurl = imgurl.replace(/\<YYYY\>/g, curYear);
				imgurl = imgurl.replace(/\<MM\>/g, curMonth);
				imgurl = imgurl.replace(/\<DD\>/g, curDay);
				
			} else if (popupComicSites[popupComicCurrent].length == 4) {
			
				logger(3, 'openPopupComic', 'extensions.daily_dilbert.openPopupComic.imageurl.byregexpr', 'Entering regexpr mode for URL determination');
				
				// parse for comics
				var regexpr = new RegExp(popupComicSites[popupComicCurrent][3], 'g');
				var liste = pagesource.match(regexpr);

				// check for result array (containing the url)
				if (liste) {

					// be fault tolerant - if multiple matches occur, use the first match
					if (liste.length == 1) {
						imgurl = popupComicSites[popupComicCurrent][1] + liste;
					} else if (liste.length > 1) {
						imgurl = popupComicSites[popupComicCurrent][1] + liste[0];
					}// if

				} else {
					loggerNG(1, 'openPopupComic', 'openPopupComic.image.notfound', [popupComicSites[popupComicCurrent][1] + popupComicSites[popupComicCurrent][2]],
						'No comic found at '+ popupComicSites[popupComicCurrent][1] + popupComicSites[popupComicCurrent][2]);
				} // if liste != null
			
			} else {
				loggerNG(1, 'openPopupComic', 'openPopupComic.property.mismatch', [popupComicCurrent],
					'Unexpected number of elements in property: comic.site.'+ popupComicCurrent);
			}// if popupComicSites.length

			if ( imgurl != '' ) {
				// open window and append URL of comic as query string
				loggerNG(4, 'openPopupComic', 'openPopupComic.openwindow', [imgurl],
					'Open window for '+ imgurl);
				popupComicWindow = window.openDialog(popupComicChromeURL + '?imgSrc=' + imgurl,
						'Strip of the Day', 'chrome=no,centerscreen');
			} else {
				logger(1, 'openPopupComic', 'openPopupComic.imagurl.isnull', 'Image URL is null');
				// as the popup wont open, user has no chance to select different comic
				// hence we shift to another comic until we reached the first one
				if (popupComicCurrent > 1) {
					popupComicCurrent--;
				}// if
			}// if imgurl

		} else { // http_request.status != 200
			
			loggerNG(1, 'openPopupComic', 'openPopupComic.http_request.failed', [http_request.status],
					'There was a problem with the request: '+ http_request.status);
			return;
			
		}// if status == 200
	}// if readyState == 4

//	logger(5, 'openPopupComic', 'generic.leavemethod', 'leave method');

}// openPopupComic

/********************************************************************
 * initPopupComic()													*
 * 																	*
 * method extracts image url from query string and load image 		*
 * dynamically into HTML, see http://forums.mozillazine.org/		*
 * viewtopic.php?p=185730&sid=1d3d8001ed90bb9b208e5553a02e83c0		*
 * Called by onLoad() eventhanlder of comic.xul						*
 *******************************************************************/
function initPopupComic() {

	// initialize all services if called within popup (comic.xul)
	initDailyDilbert();
	
	logger(5, 'initPopupComic', 'generic.entermethod', 'enter method');

	popupComicImageObj = document.getElementById('comicimg');
	popupComicDivObj = document.getElementById('comicdiv');

	if (popupComicImageObj) {
		popupComicImageObj.addEventListener('load', resizePopupComic, false);
		popupComicImageObj.src = getQueryArg('imgSrc');
	} else {
		logger(1, 'initPopupComic',
				'initPopupComic.isnull',
				'Image can not be displayed due to missing image object in DOM');
	}// if

	var popupComicSelect = document.getElementById('comicselect');
	for (var j=0; j < popupComicCount; j++) {
		popupComicSelect.options[j] = new Option(popupComicSites[j][0],j);
	}// for
	popupComicSelect.selectedIndex = popupComicCurrent;
	
	logger(5, 'initPopupComic', 'generic.leavemethod', 'leave method');

}// initPopupComic

/********************************************************************
 * saveCurrentPopupComic()												*
 * 																	*
 * read curent selected item and save value to preferences			*
 *******************************************************************/
function changePopupComicCurrent(value) {

	logger(5, 'changePopupComicCurrent', 'generic.entermethod', 'enter method');

	popupComicCurrent = value*1;
	
	dailyDilbertPreferences.setIntPref('comic.site.current', popupComicCurrent );
	
	showDailyDilbert();
	
	logger(5, 'changePopupComicCurrent', 'generic.leavemethod', 'leave method');

}// saveCurrentPopupComic

/********************************************************************
 * resizePopupComic()													*
 * 																	*
 * resize popup window to fit image width/height 					*
 * called by initPopupComic()										*
 *******************************************************************/
function resizePopupComic() {

	logger(5, 'resizePopupComic', 'generic.entermethod', 'enter method');

	if (popupComicImageObj) {
		var imageWidth = popupComicImageObj.width;
		var imageHeight = popupComicImageObj.height;
		
//		if (popupComicDivObj) {
//			popupComicDivObj.style.width = imageWidth;
//		}//if
		
		var newx = (screen.availWidth / 2) - (imageWidth / 2);
		var newy = (screen.availHeight / 2) - (imageHeight / 2);

		// add 8 pixels to with and height for boundaries
		// add 20 pixels to height for title bar
		// add 35 pixels to height for select field		
		window.resizeTo(imageWidth + 8, imageHeight +8 + 20 +35);
		window.moveTo(newx, newy);
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

	if (msgID != '' && dailyDilbertLocalizer) {
		try {
			sMsg = dailyDilbertLocalizer.GetStringFromName(dailyDilbertPrefix + msgID);
		} catch (err) {
			loggerNG(1, 'logger', '', 'Exception occurred. Original message was: '+ err);
		}// try
	}// if

	sMsg = rDate.toLocaleString() + ': ' + logLevels[lLvl - 1] + ' ('
			+ sContext + '): ' + sMsg;

	if (dailyDilbertLogger) {
		dailyDilbertLogger.log(lLvl, sMsg);
	} else {
		dump(sMsg);
	}// if

	//if (dailyDilbertIcon) {
	if ( lLvl == 1 && dailyDilbertIcon ) {
		dailyDilbertIcon.setAttribute('ddstatus', 'error');
 		dailyDilbertIcon.setAttribute('tooltiptext', sMsg);
	}// if
}// logger

/**
 * wrapper for default logger method to support substitutes
 */
function loggerNG(nLevel, sContext, msgID, subs, altMsgm) {

	var sMsg = altMsgm;
	
	if (msgID != '' && dailyDilbertLocalizer) {
		try {
			sMsg = dailyDilbertLocalizer.formatStringFromName(dailyDilbertPrefix + msgID, subs, subs.length);
		} catch (err) {
			logger(1, 'loggerNG', '', 'Exception occurred. Original message was: '+ err);
		}// try
	}// if

	logger(nLevel, sContext, '', sMsg);
	
}// loggerG

/*******************************************************************************
 * use parseQuery-method on current window and return value for specified query
 * parameter
 */
function getQueryArg(key) {
	var queryString = new String(window.location).replace(/^[^\?]+\??/, '');
	var args = parseQuery(queryString);
	return args[key];
}// getQueryArg

/**
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
