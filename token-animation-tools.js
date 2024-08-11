// SPDX-License-Identifier: GPLv3-or-later
// Copyright © 2020 fvtt-token-animation-tools Rui Pinheiro

'use strict';

import {libWrapper} from './shim.js';

Hooks.once('ready', () => {
	const MODULE_NAME = "Token Animation Tools";
	const MODULE_ID = "token-animation-tools";

	const ORIGINAL_TOKEN_SPEED = 6; // from Token.animateMovement

	console.log(`Loading ${MODULE_NAME} module...`);


	//---------------------------
	// Settings
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

	game.settings.register(MODULE_ID, 'modifier-disables-animation', {
		name: 'Modifier Key Disables Animation',
		default: 0,
		type: String,
		choices: {
			0: "None",
			1: "Control",
			2: "Alt",
			3: "Shift"
		},
		scope: 'world',
		config: true,
		hint: "If set, all token animations will be disabled when the chosen modifier key is held down. For example, if set to 'Control', if you drag a token and hold the 'Control' key before releasing the token, it will not animate."
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

	const getSetting = game.settings.get.bind(game.settings, MODULE_ID);


	//---------------------------
	// Helper functions / classes
	class TokenAnimationRay {
		static fromAnimationAttributes(token, attributes) {
			// Get x/y coordinates
			let x, y;
			for(const attr of attributes) {
				switch(attr.attribute) {
					case 'x':
						x = attr;
						break;
					case 'y':
						y = attr;
						break;
					default:
						continue;
				}

				if(x && y)
					break;
			}

			// If we're not animating in at least one of the X/Y coordinates, we don't return any ray
			if(!x && !y)
				return null;

			// Create ray
			return new this(x?.from ?? token.x, x?.to ?? token.x, y?.from ?? token.y, y?.to ?? token.y);
		}

		get speedInSpaces() {
			const customSpeed = getSetting('speed');
			if(customSpeed > 0)
				return customSpeed;

			return ORIGINAL_TOKEN_SPEED;
		}

		get speed() {
			return canvas.dimensions.size * this.speedInSpaces;
		};

		constructor(xFrom, xTo, yFrom, yTo) {
			this.xFrom = xFrom;
			this.xTo   = xTo;

			this.yFrom = yFrom;
			this.yTo   = yTo;
		}

		get distance() {
			if(this._distance === undefined) {
				const xDeltaSpaces = (this.xTo - this.xFrom) / canvas.dimensions.size;
				const yDeltaSpaces = (this.yTo - this.yFrom) / canvas.dimensions.size;
				this._distance = Math.hypot(xDeltaSpaces, yDeltaSpaces);
			}
			return this._distance;
		}

		get duration() {
			if(this._duration === undefined) {
				this._duration = (this.distance * 1000 * canvas.dimensions.size) / this.speed;
			}
			return this._duration;
		}
	}


	//---------------------------
	// Hook the Token animation code
	libWrapper.register(MODULE_ID, 'CanvasAnimation.animate', async function(wrapped, ...args) {
		//console.log('Canvas.animate', args);

		// Easier to use names for the parameters
		const attributes = args[0];
		const options    = args[1];

		// Helper function
		function skip(reason) {
			//console.log(`Skipping animation because of ${reason}`);
			options.duration = 0;
			return wrapped(...args);
		}

		// Check if we should skip the hook
		const name = options.name;
		if(options.duration === 0 || !name || !name.startsWith('Token.') || !name.endsWith('.animate'))
			return wrapped(...args);

		// Check global disables first
		if(!getSetting('animate-client') || !getSetting('animate'))
			return skip('Global disable');

		// Get token object
		const token = options.context;
		if(!token)
			throw new Error('Token Animation Tools could not find animation context');

		// Get animation ray
		const ray = TokenAnimationRay.fromAnimationAttributes(token, attributes);
		if(!ray)
			return wrapped(...args);

		// Check distance threshold
		const distanceThreshold = getSetting('distance-threshold');
		//console.log(`Distance: ${ray.distance} vs ${distanceThreshold}`);
		if(distanceThreshold > 0 && ray.distance >= distanceThreshold)
			return skip('Distance threshold');

		// Check duration threshold
		const durationThreshold = getSetting('duration-threshold');
		//console.log(`Duration: ${ray.duration} vs ${durationThreshold} (Original: ${options.duration})`);
		if(durationThreshold > 0 && ray.duration > durationThreshold)
			return skip('Duration threshold');

		// Apply custom speed
		options.duration = ray.duration;

		// Apply duration cap / speed
		const durationCap = getSetting('duration-cap');
		if(durationCap > 0 && options.duration > durationCap)
			options.duration = durationCap;

		// Call original function
		return wrapped(...args);
	});


	//---------------------------
	// Allow GM to instantly finish animations using a macro
	Hooks.on('updateToken', (doc, diff, options, userId) => {
		if(!options.concludeAnimations)
			return;

		// Get token object
		const token = doc._object;

		// Stop token animation
		if(token && token._animation) {
			// We set the animation elapsed time to the duration, which will cause the neck tick to be the last
			const animation = CanvasAnimation.getAnimation(token.animationName);
			animation.time = animation.duration;
			CanvasAnimation._animateFrame(0, animation);
		}
	});

	TokenLayer.prototype.updateConcludeAnimations = function () {
		// Select all tokens that have an active movement
		const updates = canvas.tokens.placeables.filter(t => t._animation).map(t => ({ _id: t.id }));

		// Force an update by disabling the diffing, and trigger 'concludeAnimations'
		const context = {diff: false, concludeAnimations: true};

		// Fire update request
		canvas.scene.updateEmbeddedDocuments("Token", updates, context);
	};


	//---------------------------
	// If holding Control, do not animate a token on a drag drop
	const MODIFIER_KEYS = {
		1: 'ctrlKey',
		2: 'altKey',
		3: 'shiftKey'
	};

	Hooks.on('preUpdateToken', (doc, diff, options, userId) => {
		const modifier = getSetting('modifier-disables-animation');
		if(!modifier)
			return;

		const keyVar = MODIFIER_KEYS[modifier];

		const e = window.event;
		if(!e)
			return;

		if(e[keyVar] && ('x' in diff || 'y' in diff) && !('concludeAnimations' in options) && !('animate' in options)) {
			options.concludeAnimations = true;
			options.animate = false;
		}
	});
});