// Copyright 2014 Nicholas Bray

"use strict";

var madview = {};
(function(exports) {

    var StatusBar = function() {
	this.bg = document.createElement("span");
	this.bg.className = "statusbar";
	this.fg = document.createElement("span");
	this.fg.className = "statusbarinner";
	this.bg.appendChild(this.fg);

	this.old = 0;
	this.fg.style.width = 0;
    };

    StatusBar.prototype.attach = function(parent) {
	parent.appendChild(this.bg);
    };

    StatusBar.prototype.update = function(amt) {
	var current = (amt * 100)|0;
	if (current != this.old) {
	    this.old = current;
	    this.fg.style.width = current + "%";
	}
    };

    var ButtonView = function(e, isEnabled) {
	this.element = e;
	this.enabled = true;
	this.isEnabled = isEnabled;
	this.enabledStyle = e.className;
    };

    ButtonView.prototype.sync = function(state) {
	var enabled = this.isEnabled(state);
	if (enabled != this.enabled) {
	    this.enabled = enabled;
	    var style = this.enabledStyle;
	    if (!enabled) {
		style += " disabled";
	    }
	    this.element.className = style;
	}
    };

    function inlineButton(label, onclick) {
	var e = document.createElement("a");
	e.className = "action inline";
	e.addEventListener("click", onclick);
	e.innerText = label;
	return e;
    }

    function moveButton(label, state, srcId, dstId) {
	return inlineButton(label, function() {
	    if (canMoveResource(state, srcId, dstId)) {
		moveResource(state, srcId, dstId);
	    }
	});
    }

    var ResourceView = function(view, state, config) {
	this.config = config;

	this.amount = 0;

	this.wigit = document.createElement("div");

	this.nameElement = document.createElement("span");
	this.nameElement.className = "name";
	this.nameElement.innerText = this.config["name"];
	this.wigit.appendChild(this.nameElement);

	this.amountElement = document.createElement("span");
	this.amountElement.className = "number";
	this.amountElement.innerText = this.amount;
	this.wigit.appendChild(this.amountElement);

	var showInfo = function() {
	    view.showResourceInfo(config);
	};
	this.wigit.addEventListener("mouseenter", showInfo);
	this.wigit.addEventListener("mousedown", showInfo);

	if ("capacity" in config) {
	    this.status = new StatusBar();
	    this.status.attach(this.wigit);
	}

	if ("buy" in config) {
	    this.buy = inlineButton("Buy", function() {
		if (canPayCost(state, config["buy"])) {
		    payCost(state, config["buy"]);
		    adjustResource(state, config["id"], 1);
		    view.log("Built " + config["id"] + ".");
		}
	    });
	    this.wigit.appendChild(this.buy);
	    view.ui.push(new ButtonView(this.buy, function(state) {
		return canPayCost(state, config["buy"]);
	    }));
	}

	if ("assignment" in config) {
	    this.assignAdd = moveButton("+", state, config["assignment"], config["id"]);
	    this.wigit.appendChild(this.assignAdd);
	    view.ui.push(new ButtonView(this.assignAdd, function(state) {
		return canMoveResource(state, config["assignment"], config["id"]);
	    }));

	    this.assignSub = moveButton("-", state, config["id"], config["assignment"]);
	    this.wigit.appendChild(this.assignSub);
	    view.ui.push(new ButtonView(this.assignSub, function(state) {
		return canMoveResource(state, config["id"], config["assignment"]);
	    }));
	}

	var area = document.getElementById("uiarea");
	area.appendChild(this.wigit);
    };

    ResourceView.prototype.sync = function(state) {
	var current = resourceAmount(state, this.config["id"]);
	if (current != this.amount) {
	    this.amount = current;

	    this.amountElement.innerText = current;
	}

	if (this.status) {
	    var cap = state.capacity[this.config["id"]];
	    this.status.update(current / cap);
	}
    };

    var costString = function(config) {
	var costs = [];
	for (var i in config) {
	    var cost = config[i];
	    costs.push(cost["amount"] + " " + cost["resource"]);
	}
	return costs.join(", ");
    };

    var MadSimView = function() {
	this.resourceInfo = document.createElement("div");
	this.ui = [];
    };

    MadSimView.prototype.showResourceInfo = function(config) {
	var text = config["name"] + ": " + config["info"];
	if ("buy" in config) {
	    text += "\n" + costString(config["buy"])
	}
	this.resourceInfo.innerText = text;
	this.showInfo(this.resourceInfo);
    };

    MadSimView.prototype.showActionInfo = function(config) {
	this.resourceInfo.innerText = config["name"] + ": " + costString(config["uses"]);
	this.showInfo(this.resourceInfo);
    };

    MadSimView.prototype.showInfo = function(e) {
	var area = document.getElementById("infoarea");
	area.innerHTML = "";
	area.appendChild(e);
    };

    MadSimView.prototype.log = function(message) {
	var div = document.createElement("div");
	div.innerText = message;

	var area = document.getElementById("logarea");
	area.appendChild(div);

	while (area.children.length > 40) {
	    area.removeChild(area.firstChild);
	}
	area.scrollTop = Math.max(area.scrollHeight - area.clientHeight, 0);
    };

    MadSimView.prototype.sync = function(state) {
	for (var i in this.ui) {
	    this.ui[i].sync(state);
	}
    };

    MadSimView.prototype.makeResource = function(state, config) {
	this.ui.push(new ResourceView(this, state, config));
    };

    MadSimView.prototype.makeAction = function(config, state){
	new ActionView(config, this, state);
    };

    var ActionView = function(config, view, state) {
	this.config = config

	this.wigit = document.createElement("a");
	this.wigit.className = "action";
	this.wigit.innerText = config.name;

	var showInfo = function() {
	    view.showActionInfo(config);
	};
	this.wigit.addEventListener("mouseenter", showInfo);
	this.wigit.addEventListener("mousedown", showInfo);

	this.wigit.addEventListener("click", function() {
	    performAction(view, state, config);
	});

	var area = document.getElementById("uiarea");
	area.appendChild(this.wigit);

	view.ui.push(new ButtonView(this.wigit, function(state) {
	    return canPerform(state, config);
	}));
    };

    exports.MadSimView = MadSimView;
    
})(madview);
