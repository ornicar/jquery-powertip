/**
 * PowerTip TooltipController
 *
 * @fileoverview  TooltipController object that manages tips for an instance.
 * @link          http://stevenbenner.github.com/jquery-powertip/
 * @author        Steven Benner (http://stevenbenner.com/)
 * @requires      jQuery 1.7+
 */

/**
 * Creates a new tooltip controller.
 * @private
 * @constructor
 * @param {Object} options Options object containing settings.
 */
function TooltipController(options) {
	var placementCalculator = new PlacementCalculator(),
		tipElement = $('#' + options.popupId);
	var scopedSession = session.scoped[options.popupId];
	if (!scopedSession) {
		session.scoped[options.popupId] = scopedSession = {};
	}

	// build and append tooltip div if it does not already exist
	if (tipElement.length === 0) {
		tipElement = $('<div id="' + options.popupId + '"/>');
		$('body').append(tipElement);
	}

	// if we want to be able to mouse onto the tooltip then we need to attach
	// hover events to the tooltip that will cancel a close request on hover and
	// start a new close request on mouseleave
	tipElement.on({
		mouseenter: function () {
			// check activeHover in case the mouse cursor entered the
			// tooltip during the fadeOut and close cycle
			if (scopedSession.activeHover) {
				scopedSession.activeHover[0][DATA_DISPLAYCONTROLLER].cancel();
			}
		},
		mouseleave: function () {
			// check activeHover in case the mouse cursor entered the
			// tooltip during the fadeOut and close cycle
			if (scopedSession.activeHover) {
				scopedSession.activeHover[0][DATA_DISPLAYCONTROLLER].hide();
			}
		},
	});

	/**
	 * Gives the specified element the active-hover state and queues up the
	 * showTip function.
	 * @private
	 * @param {jQuery} element The element that the tooltip should target.
	 */
	function beginShowTip(element) {
		element[0][DATA_HASACTIVEHOVER] = true;
		showTip(element);
	}

	/**
	 * Shows the tooltip, as soon as possible.
	 * @private
	 * @param {jQuery} element The element that the tooltip should target.
	 */
	function showTip(element) {
		// it is possible, especially with keyboard navigation, to move on to
		// another element with a tooltip during the queue to get to this point
		// in the code. if that happens then we need to not proceed or we may
		// have the fadeout callback for the last tooltip execute immediately
		// after this code runs, causing bugs.
		if (!element[0][DATA_HASACTIVEHOVER]) {
			return;
		}

		// if the tooltip is open and we got asked to open another one then the
		// old one is still in its fadeOut cycle, so wait and try again
		if (scopedSession.isTipOpen) {
			if (!scopedSession.isClosing) {
				hideTip(scopedSession.activeHover);
			}
			setTimeout(function () {
				showTip(element);
			}, 100);
			return;
		}

		tipElement.empty();

		// trigger powerTipPreRender event
		if (options.preRender) {
			options.preRender(element[0]);
		}

		scopedSession.activeHover = element;
		scopedSession.isTipOpen = true;

		// set tooltip position
		positionTipOnElement(element);

		tipElement.show();

		// start desync polling
		if (!scopedSession.desyncTimeout) {
			scopedSession.desyncTimeout = setInterval(closeDesyncedTip, 500);
		}
	}

	/**
	 * Hides the tooltip.
	 * @private
	 * @param {jQuery} element The element that the tooltip should target.
	 */
	function hideTip(element) {
		// reset session
		scopedSession.isClosing = true;
		scopedSession.activeHover = null;
		scopedSession.isTipOpen = false;

		// stop desync polling
		scopedSession.desyncTimeout = clearInterval(scopedSession.desyncTimeout);

		// reset element state
		element[0][DATA_HASACTIVEHOVER] = false;
		element[0][DATA_FORCEDOPEN] = false;

		// fade out
		tipElement.hide();
		var coords = new CSSCoordinates();

		// reset session and tooltip element
		scopedSession.isClosing = false;
		tipElement.removeClass();

		// support mouse-follow and fixed position tips at the same time by
		// moving the tooltip to the last cursor location after it is hidden
		coords.set('top', session.currentY + options.offset);
		coords.set('left', session.currentX + options.offset);
		tipElement.css(coords);
	}

	/**
	 * Sets the tooltip to the correct position relative to the specified target
	 * element. Based on options settings.
	 * @private
	 * @param {jQuery} element The element that the tooltip should target.
	 */
	function positionTipOnElement(element) {
		var priorityList, finalPlacement;

		if (options.smartPlacement) {
			priorityList = $.fn.powerTip.smartPlacementLists[options.placement];

			// iterate over the priority list and use the first placement option
			// that does not collide with the view port. if they all collide
			// then the last placement in the list will be used.
			$.each(priorityList, function (_, pos) {
				// place tooltip and find collisions
				var collisions = getViewportCollisions(
					placeTooltip(element, pos),
					tipElement.outerWidth() || options.defaultSize[0],
					tipElement.outerHeight() || options.defaultSize[1]
				);

				// update the final placement variable
				finalPlacement = pos;

				// break if there were no collisions
				if (collisions === Collision.none) {
					return false;
				}
			});
		} else {
			// if we're not going to use the smart placement feature then just
			// compute the coordinates and do it
			placeTooltip(element, options.placement);
			finalPlacement = options.placement;
		}
	}

	/**
	 * Sets the tooltip position to the appropriate values to show the tip at
	 * the specified placement. This function will iterate and test the tooltip
	 * to support elastic tooltips.
	 * @private
	 * @param {jQuery} element The element that the tooltip should target.
	 * @param {string} placement The placement for the tooltip.
	 * @return {CSSCoordinates} A CSSCoordinates object with the top, left, and
	 *     right position values.
	 */
	function placeTooltip(element, placement) {
		var iterationCount = 0,
			tipWidth,
			tipHeight,
			coords = new CSSCoordinates();

		// set the tip to 0,0 to get the full expanded width
		coords.set('top', 0);
		coords.set('left', 0);
		tipElement.css(coords);

		// to support elastic tooltips we need to check for a change in the
		// rendered dimensions after the tooltip has been positioned
		do {
			// grab the current tip dimensions
			tipWidth = tipElement.outerWidth() || options.defaultSize[0];
			tipHeight = tipElement.outerHeight() || options.defaultSize[1];

			// get placement coordinates
			coords = placementCalculator.compute(
				element,
				placement,
				tipWidth,
				tipHeight,
				options.offset
			);

			// place the tooltip
			tipElement.css(coords);
		} while (
			// sanity check: limit to 5 iterations, and...
			++iterationCount <= 5 &&
			// try again if the dimensions changed after placement
			(tipWidth !== tipElement.outerWidth() ||
				tipHeight !== tipElement.outerHeight())
		);

		return coords;
	}

	/**
	 * Checks for a tooltip desync and closes the tooltip if one occurs.
	 * @private
	 */
	function closeDesyncedTip() {
		var isDesynced = false;
		// It is possible for the mouse cursor to leave an element without
		// firing the mouseleave or blur event. This most commonly happens when
		// the element is disabled under mouse cursor. If this happens it will
		// result in a desynced tooltip because the tooltip was never asked to
		// close. So we should periodically check for a desync situation and
		// close the tip if such a situation arises.
		if (
			scopedSession.isTipOpen &&
			!scopedSession.isClosing &&
			!scopedSession.delayInProgress
		) {
			// user moused onto another tip or active hover is disabled
			if (
				scopedSession.activeHover[0][DATA_HASACTIVEHOVER] === false ||
				scopedSession.activeHover.is(':disabled')
			) {
				isDesynced = true;
			} else {
				// hanging tip - have to test if mouse position is not over the
				// active hover and not over a tooltip set to let the user
				// interact with it.
				// for keyboard navigation: this only counts if the element does
				// not have focus.
				// for tooltips opened via the api: we need to check if it has
				// the forcedOpen flag.
				if (
					!isMouseOver(scopedSession.activeHover) &&
					!scopedSession.activeHover.is(':focus') &&
					!scopedSession.activeHover[0][DATA_FORCEDOPEN]
				) {
					if (!isMouseOver(tipElement)) {
						isDesynced = true;
					}
				}
			}

			if (isDesynced) {
				// close the desynced tip
				hideTip(scopedSession.activeHover);
			}
		}
	}

	// expose methods
	this.showTip = beginShowTip;
	this.hideTip = hideTip;
	this.resetPosition = positionTipOnElement;
}
