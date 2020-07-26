'use strict';

(function() {
	const MODULE_NAME = "Token Animation Tools";
	const MODULE_ID = "token-animation-tools";

	const ORIGINAL_TOKEN_SPEED = 10; // from Token.animateMovement

	console.log(`Loading ${MODULE_NAME} module...`);

	Hooks.on('ready', () => {
		game.settings.register(MODULE_ID, 'animate', {
			name: 'Enable Animations',
			default: true,
			type: Boolean,
			scope: 'world',
			config: true,
			hint: 'Whether to animate tokens on drag and drop. If disabled, token movement resolves instantly.'
		});

		game.settings.register(MODULE_ID, 'animate-client', {
			name: 'Enable Animations (Client)',
			default: true,
			type: Boolean,
			scope: 'client',
			config: true,
			hint: 'Whether to animate tokens on drag and drop. If disabled, token movement resolves instantly. Per-client.'
		});

		game.settings.register(MODULE_ID, 'ctrl-disables-animation', {
			name: 'Ctrl Disables Animation',
			default: false,
			type: Boolean,
			scope: 'world',
			config: true,
			hint: "If set, all token animations will be disabled when the 'Control' key is held down. For example, if you drag a token and hold the 'Control' key before releasing the token, it will not animate."
		});

		game.settings.register(MODULE_ID, 'distance-threshold', {
			name: 'Distance Threshold',
			default: 0,
			type: Number,
			scope: 'world',
			config: true,
			hint: 'Token animations will be automatically disabled if the distance in world coordinates is larger than this threshold. Use "0" to disable.'
		});

		game.settings.register(MODULE_ID, 'duration-threshold', {
			name: 'Duration Threshold (ms)',
			default: 0,
			type: Number,
			scope: 'world',
			config: true,
			hint: 'Token animations will be automatically disabled if the animation duration in milliseconds is larger than this threshold. Use "0" to disable.'
		});

		game.settings.register(MODULE_ID, 'duration-cap', {
			name: 'Duration Cap (ms)',
			default: 0,
			type: Number,
			scope: 'world',
			config: true,
			hint: 'Token animations will be sped up if they would take more than this number of milliseconds to complete. Use "0" to disable.'
		});

		game.settings.register(MODULE_ID, 'speed', {
			name: 'Speed (spaces per second)',
			default: ORIGINAL_TOKEN_SPEED,
			type: Number,
			scope: 'world',
			config: true,
			hint: `Token Animation speed in spaces per second. Default is '${ORIGINAL_TOKEN_SPEED}'.`
		});
	});

	let getSetting = function(key) {
		try {
			return game.settings.get(MODULE_ID, key);
		}
		catch {
			return null;
		}
	};


	//---------------------------
	// Hook the Token animateMovement method and implement the main module functionality
	Token.prototype.animateMovement = (function () {
		const animateMovement = Token.prototype.animateMovement;

		// Skips Animation
		let skipAnimation = function() {
			return Promise.resolve();
		};

		// Modified version of Token.animateMovement
		let customAnimateMovement = async function(ray, speed, duration) {
			this._movement = ray;

			if(speed == null)
				speed = (ray.distance * 1000) / duration;
			if(duration == null)
				duration = (ray.distance * 1000) / speed;

			// Define attributes
			const attributes = [
			  { parent: this, attribute: 'x', to: ray.B.x },
			  { parent: this, attribute: 'y', to: ray.B.y }
			];

			// Trigger the animation function
			let animationName = `Token.${this.id}.animateMovement`;
			await CanvasAnimation.animateLinear(attributes, { name: animationName, context: this, duration: duration });
			this._movement = null;
		};

		let getSpeedInSpaces = function() {
			let customSpeed = getSetting('speed');

			if(customSpeed > 0)
				return customSpeed;

			return ORIGINAL_TOKEN_SPEED;
		}

		let getSpeed = function() {
			return canvas.dimensions.size * getSpeedInSpaces();
		};

		let getUncappedDuration = function(ray) {
			return (ray.distance * 1000) / getSpeed();
		};

		return function () {
			let ray = arguments[0];

			// Check global disables first
			if(!getSetting('animate-client') || !getSetting('animate'))
				return skipAnimation();


			// Check distance threshold
			let distanceThreshold = getSetting('distance-threshold');

			if(distanceThreshold > 0 && ray.distance >= distanceThreshold)
				return skipAnimation();


			// Check duration threshold/cap
			let durationThreshold = getSetting('duration-threshold');
			let durationCap = getSetting('duration-cap');

			if(durationThreshold > 0 && (durationCap == 0 || durationThreshold < durationCap)) {
				if(getUncappedDuration(ray) > durationThreshold)
					return skipAnimation();
			}

			if(durationCap > 0 && getUncappedDuration(ray) > durationCap)
				return customAnimateMovement.apply(this, [ray, null, durationCap]);


			// Apply custom speed (if any)
			if(getSpeedInSpaces() != ORIGINAL_TOKEN_SPEED)
				return customAnimateMovement.apply(this, [ray, getSpeed(), null]);


			// Call original function
			return animateMovement.apply(this, arguments);
		};
	})();



	//---------------------------
	// Allow GM to instantly finish animations using a macro
	Hooks.on('updateToken', (parent, data, update, options, userId) => {
		if(!options.concludeAnimations)
			return;

		let t = canvas.tokens.get(data._id);
		if(t._movement) {
			// see TokenLayer.concludeAnimations()
			let ray = t._movement;
			t._movement = null;
			t.stopAnimation();
			t.position.set(ray.B.x, ray.B.y);
		}
	});

	TokenLayer.prototype.updateConcludeAnimations = function () {
		canvas.tokens.updateMany(canvas.tokens.placeables.filter(t => t._movement).map(t => ({  _id: t.data._id })), {diff: false, concludeAnimations: true});
	};


	//---------------------------
	// If holding Control, do not animate a token on a drag drop
	Hooks.on('preUpdateToken', (parent, entity, diff, options, user_id) => {
		if(!getSetting('ctrl-disables-animation'))
			return;

		let e = window.event;
		if(!e)
			return;

		if(e.ctrlKey && ('x' in diff || 'y' in diff) && !('concludeAnimations' in options)) {
			options.concludeAnimations = true;
		}
	});


})();

