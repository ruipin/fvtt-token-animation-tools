// SPDX-License-Identifier: GPLv3-or-later
// Copyright © 2020 fvtt-token-animation-tools Rui Pinheiro

'use strict';

import {libWrapper} from './shim.js';

Hooks.once('ready', () => {
	const MODULE_NAME = "Token Animation Tools";
	const MODULE_ID = "token-animation-tools";

	const ORIGINAL_TOKEN_SPEED = 10; // from Token.animateMovement

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
	// Hook the Token animateMovement method and implement the main module functionality
	libWrapper.register(MODULE_ID, 'CanvasAnimation.animateLinear', (function() {
		const skipAnimation = function(wrapped, ...args) {
			args[1].duration = 0;

			return wrapped.apply(this, args);
		};

		const getSpeedInSpaces = function() {
			let customSpeed = getSetting('speed');

			if(customSpeed > 0)
				return customSpeed;

			return ORIGINAL_TOKEN_SPEED;
		}

		const getSpeed = function() {
			return canvas.dimensions.size * getSpeedInSpaces();
		};

		const getUncappedDuration = function(ray) {
			return (ray.distance * 1000) / getSpeed();
		};


		return async function(wrapped, ...args) {
			let options = args[1];

			// Check if we should skip the hook
			let name = options.name;
			if(options.duration === 0 || !name || !name.startsWith('Token.') || !name.endsWith('.animateMovement'))
				return wrapped.apply(this, args);


			// Get token object and movement ray
			let token = args[0][0].parent;
			let ray = token._movement;


			// Check global disables first
			if(!getSetting('animate-client') || !getSetting('animate'))
				return skipAnimation.apply(this, arguments);


			// Check distance threshold
			let distanceThreshold = getSetting('distance-threshold');

			if(distanceThreshold > 0 && ray.distance >= distanceThreshold)
				return skipAnimation.apply(this, arguments);


			// Check duration and speed
			let durationThreshold = getSetting('duration-threshold');
			let durationCap = getSetting('duration-cap');
			let customSpeed = getSpeed(token);

			if(durationThreshold > 0 && (durationCap == 0 || durationThreshold < durationCap)) {
				if(getUncappedDuration(ray) > durationThreshold)
					return skipAnimation.apply(this, arguments);
			}

			// Apply custom duration/speed (if any)
			if(durationCap > 0 && getUncappedDuration(ray) > durationCap)
				options.duration = durationCap;
			else if(customSpeed != ORIGINAL_TOKEN_SPEED)
				options.duration = (ray.distance * 1000) / customSpeed;


			// Call original function
			return wrapped.apply(this, args);
		}
	})());


	//---------------------------
	// Allow GM to instantly finish animations using a macro
	Hooks.on('updateToken', (doc, diff, options, userId) => {
		if(!options.concludeAnimations)
			return;

		let t = doc._object;
		if(t._movement) {
			// see TokenLayer.concludeAnimations(), Token.animateMovement() and Token.setPosition()

			// Stop animation
			let ray = t._movement;
			t._movement = null;
			t.stopAnimation();

			// Update position to the destination
			t.position.set(ray.B.x, ray.B.y);

			// Update sight
			t.light.coloration.position.set(0, 0);
			t.updateSource();
		}
	});

	TokenLayer.prototype.updateConcludeAnimations = function () {
		canvas.tokens.updateMany(canvas.tokens.placeables.filter(t => t._movement).map(t => ({ _id: t.data._id })), {diff: false, concludeAnimations: true});
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

		if(e[keyVar] && ('x' in diff || 'y' in diff) && !('concludeAnimations' in options)) {
			options.concludeAnimations = true;
		}
	});
});