/**
 * jQuery Content Slider Orbit
 * Build upon ZURB's Slider, www.ZURB.com/playground
 *
 * @author Hans Christian Reinl - @drublic
 */


(function($) {

	'use strict';

	var ORBIT = {

		defaults: {
			animation: 'horizontal-push',    // fade, horizontal-slide, vertical-slide, horizontal-push, vertical-push
			animationSpeed: 600,             // how fast animtions are
			timer: true,                     // true or false to have the timer
			advanceSpeed: 4000,              // if timer is enabled, time between transitions
			pauseOnHover: false,             // if you hover pauses the slider
			startClockOnMouseOut: false,     // if clock should start on MouseOut
			startClockOnMouseOutAfter: 1000, // how long after MouseOut should the timer start again
			directionalNav: true,            // manual advancing directional navs
			captions: true,                  // do you want captions?
			captionAnimation: 'fade',        // fade, slideOpen, none
			captionAnimationSpeed: 600,      // if so how quickly should they animate in
			bullets: false,                  // true or false to activate the bullet navigation
			bulletThumbs: false,             // thumbnails for the bullets
			bulletThumbLocation: '',         // location from this file where thumbs will be
			afterSlideChange: $.noop,        // empty function
			fluid: true,                     // true or ratio (ex: 4x3) to force an aspect ratio for content slides, only works from within a fluid layout
			centerBullets: true              // center bullet nav with js, turn this off if you want to position the bullet nav manually
		},

		activeSlide: 0,
		numberSlides: 0,
		orbitWidth: null,
		orbitHeight: null,
		locked: null,
		timerRunning: null,
		degrees: 0,
		wrapperHTML: '<div class="orbit-wrapper" />',
		timerHTML: '<div class="timer"><span class="mask"><span class="rotator"></span></span><span class="pause"></span></div>',
		captionHTML: '<div class="orbit-caption"></div>',
		directionalNavHTML: '<div class="slider-nav"><a href="#!" class="right">Right</a><a href="#!" class="left">Left</a></div>',
		bulletHTML: '<ul class="orbit-bullets"></ul>',

		init: function (element, options) {
			var $imageSlides,
			    imagesLoadedCount = 0,
			    self = this;

			// Bind functions to correct context
			this.clickTimer = $.proxy(this.clickTimer, this);
			this.addBullet = $.proxy(this.addBullet, this);
			this.resetAndUnlock = $.proxy(this.resetAndUnlock, this);
			this.stopClock = $.proxy(this.stopClock, this);
			this.startTimerAfterMouseLeave = $.proxy(this.startTimerAfterMouseLeave, this);
			this.clearClockMouseLeaveTimer = $.proxy(this.clearClockMouseLeaveTimer, this);
			this.rotateTimer = $.proxy(this.rotateTimer, this);

			this.options = $.extend({}, this.defaults, options);

			if (this.options.timer === 'false') {
				this.options.timer = false;
			}

			if (this.options.captions === 'false') {
				this.options.captions = false;
			}

			if (this.options.directionalNav === 'false') {
				this.options.directionalNav = false;
			}

			this.$element = $(element);
			this.$wrapper = this.$element.wrap(this.wrapperHTML).parent();
			this.$slides = this.$element.children('img, a, div');

			if (this.options.fluid) {
				this.$wrapper.addClass('fluid');
			}

			// Events
			$(document)
				.on('orbit.next', element, function () {
					self.shift('next');
				})

				.on('orbit.prev', element, function () {
					self.shift('prev');
				})

				.on('orbit.goto', element, function (event, index) {
					self.shift(index);
				})

				.on('orbit.start', element, function () {
					self.startClock();
				})

				.on('orbit.stop', element, function () {
					self.stopClock();
				});

			$imageSlides = this.$slides.filter('img');

			if ($imageSlides.length === 0) {
				this.loaded();
			} else {
				$imageSlides.on('imageready', function () {
					imagesLoadedCount += 1;
					if (imagesLoadedCount === $imageSlides.length) {
						self.loaded();
					}
				});
			}
		},

		loaded: function () {
			this.$element
				.addClass('orbit')
				.css({ width: '1px', height: '1px' });

			this.setDimentionsFromLargestSlide();
			this.updateOptionsIfOnlyOneSlide();
			this.setupFirstSlide();

			if (this.options.timer) {
				this.setupTimer();
				this.startClock();
			}

			if (this.options.captions) {
				this.setupCaptions();
			}

			if (this.options.directionalNav) {
				this.setupDirectionalNav();
			}

			if (this.options.bullets) {
				this.setupBulletNav();
				this.setActiveBullet();
			}
		},

		currentSlide: function () {
			return this.$slides.eq(this.activeSlide);
		},

		setDimentionsFromLargestSlide: function () {
			//Collect all slides and set slider size of largest image
			var self = this,
					$fluidPlaceholder;

			self.$element.add(self.$wrapper).width(this.$slides.first().width());
			self.$element.add(self.$wrapper).height(this.$slides.first().height());
			self.orbitWidth = this.$slides.first().width();
			self.orbitHeight = this.$slides.first().height();
			$fluidPlaceholder = this.$slides.first().clone();

			this.$slides.each(function () {
				var slide = $(this),
						slideWidth = slide.width(),
						slideHeight = slide.height();

				if (slideWidth > self.$element.width()) {
					self.$element.add(self.$wrapper).width(slideWidth);
					self.orbitWidth = self.$element.width();
				}
				if (slideHeight > self.$element.height()) {
					self.$element.add(self.$wrapper).height(slideHeight);
					self.orbitHeight = self.$element.height();
					$fluidPlaceholder = $(this).clone();
				}
				self.numberSlides += 1;
			});

			if (this.options.fluid) {
				if (typeof this.options.fluid === "string") {
					$fluidPlaceholder = $('<img src="http://placehold.it/' + this.options.fluid + '" />');
				}

				self.$element.prepend($fluidPlaceholder);
				$fluidPlaceholder.addClass('fluid-placeholder');
				self.$element.add(self.$wrapper).css({ width: 'inherit' });
				self.$element.add(self.$wrapper).css({ height: 'inherit' });

				$(window).on('resize', function () {
					self.orbitWidth = self.$element.width();
					self.orbitHeight = self.$element.height();
				});
			}
		},

		//Animation locking functions
		lock: function () {
			this.locked = true;
		},

		unlock: function () {
			this.locked = false;
		},

		updateOptionsIfOnlyOneSlide: function () {
			if(this.$slides.length === 1) {
				this.options.directionalNav = false;
				this.options.timer = false;
				this.options.bullets = false;
			}
		},

		setupFirstSlide: function () {
			//Set initial front photo z-index and fades it in
			this.$slides.first()
				.addClass('active');
		},

		startClock: function () {
			var self = this;

			if(!this.options.timer) {
				return false;
			}

			if (this.$timer.is(':hidden')) {
				this.clock = setInterval(function () {
					self.$element.trigger('orbit.next');
				}, this.options.advanceSpeed);
			} else {
				this.timerRunning = true;
				this.$pause.removeClass('active');
				this.clock = setInterval(this.rotateTimer, this.options.advanceSpeed / 180);
			}
		},

		rotateTimer: function () {
			var degreeCSS = "rotate(" + this.degrees + "deg)";
			this.degrees += 2;
			this.$rotator.css({
				"-webkit-transform": degreeCSS,
				"-moz-transform": degreeCSS,
				"-o-transform": degreeCSS,
				"transform": degreeCSS
			});
			if(this.degrees > 180) {
				this.$rotator.addClass('move');
				this.$mask.addClass('move');
			}
			if(this.degrees > 360) {
				this.$rotator.removeClass('move');
				this.$mask.removeClass('move');
				this.degrees = 0;
				this.$element.trigger('orbit.next');
			}
		},

		stopClock: function () {
			if (!this.options.timer) {
				return false;
			} else {
				this.timerRunning = false;
				clearInterval(this.clock);
				this.$pause.addClass('active');
			}
		},

		setupTimer: function () {
			this.$timer = $(this.timerHTML);
			this.$wrapper.append(this.$timer);

			this.$rotator = this.$timer.find('.rotator');
			this.$mask = this.$timer.find('.mask');
			this.$pause = this.$timer.find('.pause');

			this.$timer.click(this.clickTimer);

			if (this.options.startClockOnMouseOut) {
				this.$wrapper.mouseleave(this.startTimerAfterMouseLeave);
				this.$wrapper.mouseenter(this.clearClockMouseLeaveTimer);
			}

			if (this.options.pauseOnHover) {
				this.$wrapper.mouseenter(this.stopClock);
			}
		},

		startTimerAfterMouseLeave: function () {
			var self = this;

			this.outTimer = setTimeout(function() {
				if(!self.timerRunning){
					self.startClock();
				}
			}, this.options.startClockOnMouseOutAfter);
		},

		clearClockMouseLeaveTimer: function () {
			clearTimeout(this.outTimer);
		},

		clickTimer: function () {
			if(!this.timerRunning) {
					this.startClock();
			} else {
					this.stopClock();
			}
		},

		setupCaptions: function () {
			this.$caption = $(this.captionHTML);
			this.$wrapper.append(this.$caption);
			this.setCaption();
		},

		setCaption: function () {
			var captionLocation = this.currentSlide().attr('data-caption'),
					captionHTML;

			if (!this.options.captions) {
				return false;
			}

			//Set HTML for the caption if it exists
			if (captionLocation) {
				captionHTML = $(captionLocation).html(); //get HTML from the matching HTML entity
				this.$caption
					.attr('id', captionLocation) // Add ID caption TODO why is the id being set?
					.html(captionHTML); // Change HTML in Caption
				//Animations for Caption entrances
				switch (this.options.captionAnimation) {
					case 'none':
						this.$caption.show();
						break;
					case 'fade':
						this.$caption.fadeIn(this.options.captionAnimationSpeed);
						break;
					case 'slideOpen':
						this.$caption.slideDown(this.options.captionAnimationSpeed);
						break;
				}
			} else {
				//Animations for Caption exits
				switch (this.options.captionAnimation) {
					case 'none':
						this.$caption.hide();
						break;
					case 'fade':
						this.$caption.fadeOut(this.options.captionAnimationSpeed);
						break;
					case 'slideOpen':
						this.$caption.slideUp(this.options.captionAnimationSpeed);
						break;
				}
			}
		},

		setupDirectionalNav: function () {
			var self = this;

			this.$wrapper.append(this.directionalNavHTML);

			this.$wrapper.find('.left').click(function () {
				self.stopClock();
				self.$element.trigger('orbit.prev');
			});

			this.$wrapper.find('.right').click(function () {
				self.stopClock();
				self.$element.trigger('orbit.next');
			});
		},

		setupBulletNav: function () {
			this.$bullets = $(this.bulletHTML);
			this.$wrapper.append(this.$bullets);
			this.$slides.each(this.addBullet);
			this.$element.addClass('with-bullets');

			if (this.options.centerBullets) {
				this.$bullets.css('margin-left', -this.$bullets.width() / 2);
			}
		},

		addBullet: function (index, slide) {
			var position = index + 1,
					$li = $('<li>' + (position) + '</li>'),
					thumbName,
					self = this;

			if (this.options.bulletThumbs) {
				thumbName = $(slide).attr('data-thumb');
				if (thumbName) {
					$li
						.addClass('has-thumb')
						.css({background: "url(" + this.options.bulletThumbLocation + thumbName + ") no-repeat"});
				}
			}
			this.$bullets.append($li);
			$li.data('index', index);
			$li.click(function () {
				self.stopClock();
				self.$element.trigger('orbit.goto', [$li.data('index')]);
			});
		},

		setActiveBullet: function () {
			if(!this.options.bullets) { return false; } else {
				this.$bullets.find('li')
					.removeClass('active')
					.eq(this.activeSlide)
					.addClass('active');
			}
		},

		resetAndUnlock: function () {
			this.$slides
				.eq(this.prevActiveSlide)
				.removeClass('active');
			this.unlock();
			this.options.afterSlideChange.call(this, this.$slides.eq(this.prevActiveSlide), this.$slides.eq(this.activeSlide));
		},

		shift: function (direction) {
			var slideDirection = direction;

			//remember previous activeSlide
			this.prevActiveSlide = this.activeSlide;

			//exit function if bullet clicked is same as the current image
			if (this.prevActiveSlide === slideDirection) {
				return false;
			}

			if (this.$slides.length === "1") {
				return false;
			}

			if (!this.locked) {
				this.lock();
				//deduce the proper activeImage
				if (direction === "next") {
					this.activeSlide += 1;
					if (this.activeSlide === this.numberSlides) {
							this.activeSlide = 0;
					}
				} else if (direction === "prev") {
					this.activeSlide -= 1;
					if (this.activeSlide < 0) {
						this.activeSlide = this.numberSlides - 1;
					}
				} else {
					this.activeSlide = direction;
					if (this.prevActiveSlide < this.activeSlide) {
						slideDirection = "next";
					} else if (this.prevActiveSlide > this.activeSlide) {
						slideDirection = "prev";
					}
				}

				//set to correct bullet
				this.setActiveBullet();

				//set previous slide z-index to one below what new activeSlide will be
				this.$slides
					.eq(this.prevActiveSlide)
					.removeClass('active');

				//fade
				if (this.options.animation === "fade") {
					this.$slides
						.eq(this.activeSlide)
						.css({ "opacity" : 0 })
						.addClass('active')
						.animate({ "opacity": 1 }, this.options.animationSpeed, this.resetAndUnlock);
				}

				//horizontal-slide
				if (this.options.animation === "horizontal-slide") {
					if (slideDirection === "next") {
						this.$slides
							.eq(this.activeSlide)
							.addClass('active')
							.css({"left": this.orbitWidth})
							.animate({"left" : 0}, this.options.animationSpeed, this.resetAndUnlock);
					}
					if (slideDirection === "prev") {
						this.$slides
							.eq(this.activeSlide)
							.addClass('active')
							.css({"left": -this.orbitWidth})
							.animate({"left" : 0}, this.options.animationSpeed, this.resetAndUnlock);
					}
				}

				//vertical-slide
				if (this.options.animation === "vertical-slide") {
					if (slideDirection === "prev") {
						this.$slides
							.eq(this.activeSlide)
							.addClass('active')
							.css({"top": this.orbitHeight})
							.animate({"top" : 0}, this.options.animationSpeed, this.resetAndUnlock);
					}
					if (slideDirection === "next") {
						this.$slides
							.eq(this.activeSlide)
							.addClass('active')
							.css({"top": -this.orbitHeight})
							.animate({"top" : 0}, this.options.animationSpeed, this.resetAndUnlock);
					}
				}

				//horizontal-push
				if (this.options.animation === "horizontal-push") {
					if (slideDirection === "next") {
						this.$slides
							.eq(this.activeSlide)
							.addClass('active')
							.css({"left": this.orbitWidth})
							.animate({"left" : 0}, this.options.animationSpeed, this.resetAndUnlock);
						this.$slides
							.eq(this.prevActiveSlide)
							.animate({"left" : -this.orbitWidth}, this.options.animationSpeed);
					}
					if (slideDirection === "prev") {
						this.$slides
							.eq(this.activeSlide)
							.addClass('active')
							.css({"left": -this.orbitWidth})
							.animate({"left" : 0}, this.options.animationSpeed, this.resetAndUnlock);
						this.$slides
							.eq(this.prevActiveSlide)
							.animate({"left" : this.orbitWidth}, this.options.animationSpeed);
					}
				}

				//vertical-push
				if (this.options.animation === "vertical-push") {
					if (slideDirection === "next") {
						this.$slides
							.eq(this.activeSlide)
							.addClass('active')
							.css({top: -this.orbitHeight})
							.animate({top : 0}, this.options.animationSpeed, this.resetAndUnlock);
						this.$slides
							.eq(this.prevActiveSlide)
							.animate({top : this.orbitHeight}, this.options.animationSpeed);
					}
					if (slideDirection === "prev") {
						this.$slides
							.eq(this.activeSlide)
							.addClass('active')
							.css({top: this.orbitHeight})
							.animate({top : 0}, this.options.animationSpeed, this.resetAndUnlock);
						this.$slides
							.eq(this.prevActiveSlide)
							.animate({top : -this.orbitHeight}, this.options.animationSpeed);
					}
				}

				this.setCaption();
			}
		}
	};




	/**
	 * Touch events
	 */

	if (window.Modernizr && !window.Modernizr.touch) {
		return;
	}

	var startX, startY, cwidth, dx,
			scrolling = false;

	var $slider = $('.orbit');
	var navigation = $('.slider-nav');

	var methods = {
		getCurrentSlide: function () {
			return $('.orbit-bullets > li').index('.active');
		},

		resetSlider: function () {
			$slider[0].removeEventListener('touchmove', methods.onTouchMove, false);
			$slider[0].removeEventListener('touchend', methods.onTouchEnd, false);

			startX = null;
			startY = null;
			dx = null;
		},

		onTouchStart: function (e) {
			if (e.touches.length === 1) {
				$slider[0].addEventListener('touchmove', methods.onTouchMove, false);
				$slider[0].addEventListener('touchend', methods.onTouchEnd, false);

				startX = e.touches[0].pageX;
				startY = e.touches[0].pageY;
				cwidth = $slider.height();
			}
		},

		onTouchMove: function (e) {
			dx = startX - e.touches[0].pageX;
			scrolling = Math.abs(dx) < Math.abs(startY - e.touches[0].pageY);

			if (!scrolling) {
				e.preventDefault();

				dx = (function () {
					return dx / cwidth;
				}());
			} else {
				methods.resetSlider();
			}
		},

		onTouchEnd: function () {
			if (dx !== null) {
				var target;

				if (dx > 0) {
					target = navigation.children('.right');
				} else {
					target = navigation.children('.left');
				}

				if (Math.abs(dx) > 0.2 || Math.abs(dx) > cwidth / 2) {
					target.trigger('click');
				}
			}

			// finish the touch by undoing the touch session
			methods.resetSlider();
		}
	};

	if ($slider.length > 0) {
		$slider[0].addEventListener('touchstart', methods.onTouchStart, false);
	}


	/**
	 * Make it a plugin
	 */
	$.fn.orbit = function (options) {
		return this.each(function () {
			var orbit = $.extend({}, ORBIT);
			orbit.init(this, options);
		});
	};

})(jQuery);

/*!
 * jQuery imageready Plugin
 * http://www.zurb.com/playground/
 *
 * Copyright 2011, ZURB
 * Released under the MIT License
 */
(function ($) {

	'use strict';

	var options = {};

	var bindToLoad = function (element, callback) {
		var $element = $(element);

		$element.on('load.imageready', function () {
			callback.apply(element, arguments);
			$element.off('load.imageready');
		});
	};

	$.event.special.imageready = {

		setup: function (data) {
			options = data || options;
		},

		add: function (handleObj) {
			var $this = $(this),
					src;

			if ( this.nodeType === 1 && this.tagName.toLowerCase() === 'img' && this.src !== '' ) {
				if (options.forceLoad) {
					src = $this.attr('src');
					$this.attr('src', '');
					bindToLoad(this, handleObj.handler);
					$this.attr('src', src);
				} else if ( this.complete || this.readyState === 4 ) {
					handleObj.handler.apply(this, arguments);
				} else {
					bindToLoad(this, handleObj.handler);
				}
			}
		},

		teardown: function () {
			$(this).off('.imageready');
		}
	};

}(jQuery));
