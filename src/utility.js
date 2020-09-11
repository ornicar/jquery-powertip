/**
 * PowerTip Utility Functions
 *
 * @fileoverview  Private helper functions.
 * @link          http://stevenbenner.github.com/jquery-powertip/
 * @author        Steven Benner (http://stevenbenner.com/)
 * @requires      jQuery 1.7+
 */

/**
 * Initializes the viewport dimension cache and hooks up the mouse position
 * tracking and viewport dimension tracking events.
 * Prevents attaching the events more than once.
 * @private
 */
function initTracking() {
	if (!session.mouseTrackingActive) {
		session.mouseTrackingActive = true;

		// grab the current viewport dimensions on load
    session.scrollLeft = window.scrollX;
    session.scrollTop = window.scrollY;
    session.windowWidth = $window.width();
    session.windowHeight = $window.height();

		// hook mouse move tracking
    document.addEventListener('mousemove', trackMouse);

		// hook viewport dimensions tracking
    window.addEventListener('resize', function() {
				session.windowWidth = $window.width();
				session.windowHeight = $window.height();
			}, { passive: true });

    window.addEventListener('scroll', function() {
				var x = window.scrollX,
					y = window.scrollY;
				if (x !== session.scrollLeft) {
					session.currentX += x - session.scrollLeft;
					session.scrollLeft = x;
				}
				if (y !== session.scrollTop) {
					session.currentY += y - session.scrollTop;
					session.scrollTop = y;
				}
			}, { passive: true });
	}
}

/**
 * Saves the current mouse coordinates to the session object.
 * @private
 * @param {jQuery.Event} event The mousemove event for the document.
 */
function trackMouse(event) {
	session.currentX = event.pageX;
	session.currentY = event.pageY;
}

/**
 * Tests if the mouse is currently over the specified element.
 * @private
 * @param {jQuery} element The element to check for hover.
 * @return {boolean}
 */
function isMouseOver(element) {
	var elementPosition = element.offset();
	return session.currentX >= elementPosition.left &&
		session.currentX <= elementPosition.left + element.width() &&
		session.currentY >= elementPosition.top &&
		session.currentY <= elementPosition.top + element.height();
}

/**
 * Finds any viewport collisions that an element (the tooltip) would have if it
 * were absolutely positioned at the specified coordinates.
 * @private
 * @param {CSSCoordinates} coords Coordinates for the element.
 * @param {number} elementWidth Width of the element in pixels.
 * @param {number} elementHeight Height of the element in pixels.
 * @return {number} Value with the collision flags.
 */
function getViewportCollisions(coords, elementWidth, elementHeight) {
	var viewportTop = session.scrollTop,
		viewportLeft =  session.scrollLeft,
		viewportBottom = viewportTop + session.windowHeight,
		viewportRight = viewportLeft + session.windowWidth,
		collisions = Collision.none;

	if (coords.top < viewportTop || Math.abs(coords.bottom - session.windowHeight) - elementHeight < viewportTop) {
		collisions |= Collision.top;
	}
	if (coords.top + elementHeight > viewportBottom || Math.abs(coords.bottom - session.windowHeight) > viewportBottom) {
		collisions |= Collision.bottom;
	}
	if (coords.left < viewportLeft || coords.right + elementWidth > viewportRight) {
		collisions |= Collision.left;
	}
	if (coords.left + elementWidth > viewportRight || coords.right < viewportLeft) {
		collisions |= Collision.right;
	}

	return collisions;
}
