/**
 * PowerTip Core
 *
 * @fileoverview  Core variables, plugin object, and API.
 * @link          http://stevenbenner.github.com/jquery-powertip/
 * @author        Steven Benner (http://stevenbenner.com/)
 * @requires      Cash.js
 */

// constants
var DATA_DISPLAYCONTROLLER = 'displayController',
	DATA_HASACTIVEHOVER = 'hasActiveHover',
	DATA_FORCEDOPEN = 'forcedOpen';

/**
 * Session data
 * Private properties global to all powerTip instances
 */
var session = {
	isTipOpen: false,
	isClosing: false,
	tipOpenImminent: false,
	activeHover: null,
	currentX: 0,
	currentY: 0,
	previousX: 0,
	previousY: 0,
	desyncTimeout: null,
	mouseTrackingActive: false,
	delayInProgress: false,
	windowWidth: 0,
	windowHeight: 0,
	scrollTop: 0,
	scrollLeft: 0,
};

/**
 * Collision enumeration
 * @enum {number}
 */
var Collision = {
	none: 0,
	top: 1,
	bottom: 2,
	left: 4,
	right: 8,
};

/**
 * Display hover tooltips on the matched elements.
 * @param {(Object|string)} opts The options object to use for the plugin, or
 *     the name of a method to invoke on the first matched element.
 * @param {*=} [arg] Argument for an invoked method (optional).
 * @return {jQuery} jQuery object for the matched selectors.
 */
$.fn.powerTip = function (opts) {
	// don't do any work if there were no matched elements
	if (!this.length) {
		return this;
	}

	// extend options and instantiate TooltipController
	var options = Object.assign({}, $.fn.powerTip.defaults, opts),
		tipController = new TooltipController(options);

	// hook mouse and viewport dimension tracking
	initTracking();

	// setup the elements
	this.each(function () {
		var $this = $(this);

		// handle repeated powerTip calls on the same element by destroying the
		// original instance hooked to it and replacing it with this call
		if (this[DATA_DISPLAYCONTROLLER]) {
			$.powerTip.destroy($this);
		}

		// create hover controllers for each element
		this[DATA_DISPLAYCONTROLLER] = new DisplayController(
			$this,
			options,
			tipController
		);
	});

	// attach events to matched elements if the manual options is not enabled
	this.on({
		// mouse events
		mouseenter: function (event) {
			$.powerTip.show(this, event);
		},
		mouseleave: function () {
			$.powerTip.hide(this);
		},
	});

	return this;
};

/**
 * Default options for the powerTip plugin.
 */
$.fn.powerTip.defaults = {
	popupId: 'powerTip',
	intentSensitivity: 7,
	intentPollInterval: 150,
	closeDelay: 150,
	placement: 'n',
	smartPlacement: true,
	defaultSize: [260, 120],
	offset: 10,
};

/**
 * Default smart placement priority lists.
 * The first item in the array is the highest priority, the last is the lowest.
 * The last item is also the default, which will be used if all previous options
 * do not fit.
 */
$.fn.powerTip.smartPlacementLists = {
	n: ['n', 'ne', 'nw', 's'],
	e: ['e', 'ne', 'se', 'w', 'nw', 'sw', 'n', 's', 'e'],
	s: ['s', 'se', 'sw', 'n'],
	w: ['w', 'nw', 'sw', 'e', 'ne', 'se', 'n', 's', 'w'],
	nw: ['nw', 'w', 'sw', 'n', 's', 'se', 'nw'],
	ne: ['ne', 'e', 'se', 'n', 's', 'sw', 'ne'],
	sw: ['sw', 'w', 'nw', 's', 'n', 'ne', 'sw'],
	se: ['se', 'e', 'ne', 's', 'n', 'nw', 'se'],
};

/**
 * Public API
 */
$.powerTip = {
	/**
	 * Attempts to show the tooltip for the specified element.
	 * @param {jQuery|Element} element The element to open the tooltip for.
	 * @param {jQuery.Event=} event jQuery event for hover intent and mouse
	 *     tracking (optional).
	 */
	show: function apiShowTip(element, event) {
		if (event) {
			trackMouse(event);
			session.previousX = event.pageX;
			session.previousY = event.pageY;
			$(element)[0][DATA_DISPLAYCONTROLLER].show();
		} else {
			$(element).first()[0][DATA_DISPLAYCONTROLLER].show(true, true);
		}
		return element;
	},

	/**
	 * Repositions the tooltip on the element.
	 * @param {jQuery|Element} element The element the tooltip is shown for.
	 */
	reposition: function apiResetPosition(element) {
		$(element).first()[0][DATA_DISPLAYCONTROLLER].resetPosition();
		return element;
	},

	/**
	 * Attempts to close any open tooltips.
	 * @param {(jQuery|Element)=} element The element with the tooltip that
	 *     should be closed (optional).
	 * @param {boolean=} immediate Disable close delay (optional).
	 */
	hide: function apiCloseTip(element, immediate) {
		if (element) {
			$(element).first()[0][DATA_DISPLAYCONTROLLER].hide(immediate);
		} else {
			if (session.activeHover) {
				session.activeHover[0][DATA_DISPLAYCONTROLLER].hide(true);
			}
		}
		return element;
	},

	/**
	 * Destroy and roll back any powerTip() instance on the specified element.
	 * @param {jQuery|Element} element The element with the powerTip instance.
	 */
	destroy: function apiDestroy(element) {
		$(element)
			.off('.powertip')
			.each(function () {
				delete this[DATA_DISPLAYCONTROLLER];
				delete this[DATA_HASACTIVEHOVER];
				delete this[DATA_FORCEDOPEN];
			});
		return element;
	},
};

// API aliasing
$.powerTip.showTip = $.powerTip.show;
$.powerTip.closeTip = $.powerTip.hide;
