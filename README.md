# FVTT Token Animation Tools
Module for Foundry VTT that provides macros and configuration options to control Token animations.

[![License](https://img.shields.io/github/license/ruipin/fvtt-token-animation-tools)](LICENSE)
[![Build Release](https://github.com/ruipin/fvtt-token-animation-tools/workflows/Build%20Release/badge.svg)](https://github.com/ruipin/fvtt-token-animation-tools/releases/latest)
[![Version (latest)](https://img.shields.io/github/v/release/ruipin/fvtt-token-animation-tools)](https://github.com/ruipin/fvtt-token-animation-tools/releases/latest)
[![Foundry Version](https://img.shields.io/badge/dynamic/json.svg?url=https://github.com/ruipin/fvtt-token-animation-tools/releases/latest/download/module.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=blueviolet)](https://github.com/ruipin/fvtt-token-animation-tools/releases/latest)
[![GitHub downloads (latest)](https://img.shields.io/badge/dynamic/json?label=Downloads@latest&query=assets[?(@.name.includes('zip'))].download_count&url=https://api.github.com/repos/ruipin/fvtt-token-animation-tools/releases/latest&color=green)](https://github.com/ruipin/fvtt-token-animation-tools/releases/latest)
[![Forge Install Base](https://img.shields.io/badge/dynamic/json?label=Forge%20Install%20Base&query=package.installs&suffix=%&url=https://forge-vtt.com/api/bazaar/package/token-animation-tools&colorB=brightgreen)](https://forge-vtt.com/)
[![GitHub issues](https://img.shields.io/github/issues-raw/ruipin/fvtt-token-animation-tools)](https://github.com/ruipin/fvtt-token-animation-tools/issues)
[![Ko-fi](https://img.shields.io/badge/-buy%20me%20a%20coffee-%23FF5E5B?logo=Ko-fi&logoColor=white)](https://ko-fi.com/ruipin)


## Features

* Enable/disable Token Animations on a world and/or client level.
* Disable Token Animations when a modifier key is held down.
* Disable Token Animations automatically when the drag distance is above a user-defined threshold in world coordinates.
* Disable Token Animations automatically when the duration is above a user-defined threshold in milliseconds.
* Set a Token Animation duration cap, so that animations will never last longer than a user-defined duration in milliseconds.
* Change the default animation speed.
* Includes a basic set of macros, including one to enable/disable/toggle animations, and one that instantly finishes any on-going animations.


### Module Configuration

![Module Configuration](https://github.com/ruipin/fvtt-token-animation-tools/blob/7bd879c67528e9ccf031a1509731c1ae7f61f8c5/module-settings.png)
<sub>Note: Images may be out of date</sub>


## Installation
1. Copy this link and use it in Foundry's Module Manager to install the Module

    > https://raw.githubusercontent.com/ruipin/fvtt-token-animation-tools/master/module.json

2. Enable the Module in your World's Module Settings


### libWrapper

This module uses the [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper) library for wrapping core methods. While this is not a hard dependency, it is recommended to install it for the best experience and compatibility with other modules.