/*!
 * Autocomplete
 * autosearch.js
 * Requirements: jQuery 1.2 or above
 * Usage:
 * $(function() { new $.acr("elementID",{options});	});
 * var defaults is a configurable parameters
 * autosearch.css styles for autosearch
 * Copyright 2011, Aliaksei_Tryputsen
 */

/**
 * default configuration
 */
var defaults = {
    resultsClass: "results",			//class for result
	unSelectClass: "unselected",		//class for unselect        
    selectClass: "selected",			//class for select
    queryParamName: "term",				//in what param send data
    limitParamName: "limit",			//in what param send max items
    minChars: 2,						//min chars to start autosearch
    useCache: false,						//use cache
    maxCharsInRow: 25,					//max chars in each row, useCache param must be enable
    delay: 400,							//delay while autocomplete start			      
    showResult: null,					//default function for results for example ( function(value, data) {return '<span style="color:red">' + value + '</span>';} )
    displayValue: null,
	listTotal: 10,						//max item send in limit param
	parentJSONEl: "ResultSet",					//Parent JSON element
	resultJSONEl: "Result",					//Array of results
	requiredJSONEl: "requiredFields",				//Array of reuired fields in result, first element must be a keyword
	displayJSONEl: "Display",				//Array of reuired fields in result, first element must be a keyword	
	listCurrent: -1						//default list
};	

(function ($) {  
    /**
     * acr Object
     * @param {String} el element id
     * @param {Object=} opt Settings
     * @constructor
     */

	$.acr = function (el, opt) {
		var element = $("#" + el), options = $.extend({}, defaults, opt), self_ = this;
	    //check is object INPUT
	    if (!element || element.length !== 1 || element.get(0).tagName.toUpperCase() !== "INPUT") {
	        return false;	
		}
	    //options
	    if (typeof options === "string") {
	        this.options = { url: options };
		} else {
	        this.options = options;
		}
	    //browser autocomplete off
	    element.attr("autocomplete", "off");
	    this.dom = {};
	    this.dom.elem = element;
		this.dom.results = $('<ul id="' + this.options.resultsClass + '"></ul>').css({'display': 'none'});
		$(element).parent().append(this.dom.results);
		// on key up 
		element.bind('keyup', function (e) {
	            self_.lastKeyPressed = e.keyCode;
	            var lastVal = element.val();
				// check an treat up and down arrows
				if (self_.updownArrow(self_.lastKeyPressed)) { 
					return false;
				}
				// check for an ENTER or ESC
				if (self_.lastKeyPressed === 13 || self_.lastKeyPressed === 27 || self_.lastKeyPressed === 9) {
					e.preventDefault();
					self_.clearAutoComplete();
					return false;
				}
                setTimeout(function () { 
					self_.finishComplete(lastVal);
				}, self_.options.delay);
		});
	}; 
	
	
	/**
	 * finishComplete
	 * @param {string} lastValue
	 */
	$.acr.prototype.finishComplete = function (lastValue)
	{
		var self_ = this;
		// get the field value
		var term = this.dom.elem.val();
	
		// if field value empty clear the resuts box and return
		if (term === '') {
			this.clearAutoComplete();
			return false;
		}
	
		// if value equal the value from the last call, allow
		if (lastValue !== term) {
			return false;
		}
		var resp_url = this.options.url;
		resp_url += resp_url.indexOf("?") === -1 ? "?" : "&";
		resp_url += this.options.queryParamName;
		resp_url += "=";
		resp_url += term;
		resp_url += "&"; 
		resp_url += this.options.limitParamName;
		resp_url += "=";
		resp_url += this.options.listTotal;
		var resultArr = [];
		var required = [];
		if (lastValue.length >= this.options.minChars) {
			$.ajax({
				type: "GET",
				url: resp_url,
				async: false,
				dataType: "text/plain",
				success: function (d) {
				var json = JSON.parse(d);
				if (self_.options.parentJSONEl && self_.options.resultJSONEl) {
					resultArr = json[self_.options.parentJSONEl][self_.options.resultJSONEl];
					if (self_.options.requiredJSONEl) {
						required = json[self_.options.parentJSONEl][self_.options.requiredJSONEl];			
					} else {
						for (var field in resultArr[0]) {
							required.push(field);
						}									
					}
				} else {
					resultArr = json;
					for (var fld in json[0]) {
						required.push(fld);
					}													
				}
				// get the total of results
				var dataLength = null;
				if (self_.options.listTotal > resultArr.length) {
					dataLength = resultArr.length;
				} else {
					dataLength = self_.options.listTotal;
				}	
				// if there are results populate the results div
				if (dataLength > 0) {
		
					var newData = '';
					newData += '<a class="close" href="#">X</a>';
					self_.position();
					self_.cacheReset();
					// create a div for each result
					for (var i=0; i < dataLength; i++) {
					newData += '<li class="'+ self_.options.unSelectClass + '">' ;
					var newDateArr = [];
					var req_length = required.length;
					for (var k=0; k < req_length; k++) {
						if (k !== req_length-1) {
							newDateArr.push(resultArr[i][required[k+1]]);
						}
					}
					if (self_.options.useCache) {
						var filter = resultArr[i][required[0]].slice(0,self_.options.maxCharsInRow);	
						self_.cachePut(filter,resultArr[i]);
						newData += self_.showResult(filter,newDateArr);						
					} else {
						newData += self_.showResult(resultArr[i][required[0]],newDateArr);
					}
					newData +='</li>';
					}
					// update the results div
					self_.dom.results.html(newData);
					self_.dom.results.css({'display':'block'});
					// on blur
					$('A.close').bind('click',function (e) {
						e.preventDefault();
						setTimeout(function () {
							self_.clearAutoComplete();
						}, self_.options.delay);
					});					
					
					// for all divs in results
					var $divs = self_.dom.results.find("li");
					// on mouse over clean previous selected and set a new one
					$divs.bind('mouseover', function() {
						$divs.each(function(){ this.className = self_.options.unSelectClass; });
						this.className = self_.options.selectClass;
						var div_length = $divs.length;
				        for (var i = 0; i < div_length; i++) {
				            if ($($divs[i]).hasClass(self_.options.selectClass)) {
				                self_.options.listCurrent = i;
				            }
				        }			
					});
					// on click copy the result text to the search field and hide
					$divs.bind('click', function() {
						if (self_.options.useCache) {
							self_.displayValue(self_.cacheData,this);
						} else {
							self_.displayValue(null,this);
						}
						self_.clearAutoComplete();				
					});
				} else {
					self_.clearAutoComplete();
				}
			  }
			});
		}
	};
	
	/**
	 * showResult
	 * @param {string} value	 
	 * @param {string} data 
	 */	
    $.acr.prototype.showResult = function(value, data) {
		if (this.options.useCache) {
			if (value.length >= this.options.maxCharsInRow) {
				value += '...';
			}
		}
        if ($.isFunction(this.options.showResult)) {
            return this.options.showResult(value, data);
        } else {
			if ($.isArray(data)) {
				var dat_length = data.length;
				for (var i=0;i<dat_length;i++) {
					value += " <span>";
					value += data[i];
					value += "</span>";
				}
			} else {
				value += " <span>";
				value += data;
				value += "</span>";
			}
			return value;
        }
    };		

	/**
	 * display value
	 * @param {Object} content
	 */    
	$.acr.prototype.displayValue = function(data,content) {
	    if ($.isFunction(this.options.displayValue)) {
			return this.options.displayValue(data,content.childNodes[0].textContent.replace('...',''));
	    }		
		if ($.isFunction(this.options.showResult)) {
			if (this.options.useCache) {
				this.dom.elem.val(this.cacheRead(content.childNodes[0].textContent));
			} else {
				console.log(content);
				this.dom.elem.val(content.childNodes[0].textContent);	//if showResult not null display child text content 
			}			
		} else {
			var cont_val = $(content).clone().children().remove().end().text().trim();
			if (this.options.useCache) {
				this.dom.elem.val(this.cacheRead(cont_val));
			} else {
				this.dom.elem.val(cont_val);
			}
		}
	};  
	
    /**
     * Read cache
     */
	$.acr.prototype.cacheRead = function(filter) {
		if (this.options.useCache) {
			filter = filter.replace('...','');
			if (this.cacheData[filter] !== undefined) {
				return this.cacheData[filter][this.displayJSONEl];
	        }
		}
		return false;
	};	
	
	
    /**
     * Write to cache
     */
    $.acr.prototype.cachePut = function(data_slice, data) {
        if (this.options.useCache) {
            if (this.cacheData[data_slice] !== undefined) {
                this.cacheLength++;
            }
            this.cacheData[data_slice] = data;
            return this.cacheData[data_slice];
        }
        return false;
    };

    /**
     * Reset cache
     */
    $.acr.prototype.cacheReset = function() {
        this.cacheData = {};
        this.cacheLength = 0;
    };	  
	
	/**
	 * updownArrow
	 * @param {number} keyCode
	 */
	$.acr.prototype.updownArrow = function (keyCode) {
		if (keyCode === 40 || keyCode === 38) {	
			if (keyCode === 38) { // keyUp
				if (this.options.listCurrent === 0 || this.options.listCurrent === -1) {
					this.options.listCurrent = this.options.listTotal-1;
				} else {
					this.options.listCurrent--;
				}
			} else { // keyDown
				if(this.options.listCurrent === this.options.listTotal-1) {
					this.options.listCurrent = 0;
				} else {
					this.options.listCurrent++;
				}
			}
			var self_ = this;
			// loop through each result div applying styles
			
			var res_li = self_.dom.results.find('LI');
			for (var i=0,lilen = res_li.length;i<lilen;i++) {
				if(i === self_.options.listCurrent){
					if (self_.options.useCache) {
						self_.displayValue(self_.cacheData,res_li[i]);
					} else {
						self_.displayValue(null,res_li[i]);
					}					
					res_li[i].className = self_.options.selectClass;
				} else {
					res_li[i].className = self_.options.unSelectClass;
				}
			}
			return true;
		} else {
			// clear
			this.options.listCurrent = -1;
			return false;
		}
	};
	
	/**
	 * clearAutoComplete
	 */
	$.acr.prototype.clearAutoComplete = function ()
	{
		this.dom.results.css({'display':'none'});
		this.options.listCurrent = -1;
	};
	
	/**
	 * position
	 */
	$.acr.prototype.position = function ()
	{
        var elementPos = this.dom.elem.offset();
        this.dom.results.css({
            top: elementPos.top + this.dom.elem.outerHeight()
        });
	};	
})(jQuery);