/**
 * 导出 Delegator 构造函数.
 */
module.exports = Delegator;

/**
 * 初始化 Delegator 构造函数.
 *
 * @constructor
 * @param {Object} proto - 委托操作的的对象.
 * @param {string} target - 被委托的属性名称.
 */
function Delegator(proto, target) {
  // 调用 Delegator 构造函数时判断，如果 Delegator 不在 this 的原型链上，就执行实例化并返回.
  // 其实在执行实例化的时候会再次进入 Delegator 构造函数，此时 if 判断就会通过，继续执行 Delegator 构造函数中剩下的语句以完成初始化.
  if (!(this instanceof Delegator)) return new Delegator(proto, target);

  this.proto = proto;
  this.target = target;
  this.methods = [];
  this.getters = [];
  this.setters = [];
  this.fluents = [];
}

/**
 * 静态方法 - 遍历额外提供的属性对象并根据属性值自动判断绑定相应的委托.
 *
 * @param {Object} proto - 委托操作的的对象.
 * @param {Object} targetProto - 需要自动处理的属性对象.
 * @param {string} targetProp - 被委托的属性名称.
 */
Delegator.auto = function(proto, targetProto, targetProp) {
  // 先实例化一个 delegator 对象.
  var delegator = Delegator(proto, targetProp);

  // 再获取属性数组.
  var properties = Object.getOwnPropertyNames(targetProto);

  // 遍历属性数组.
  for (var i = 0; i < properties.length; i++) {
    var property = properties[i];

    // 获取到属性对应的属性描述符.
    var descriptor = Object.getOwnPropertyDescriptor(targetProto, property);

    // 如果属性描述符有设置 get 函数，则给属性添加 getter 委托.
    if (descriptor.get) {
      delegator.getter(property);
    }

    // 如果属性描述符有设置 set 函数，则给属性添加 setter 委托.
    if (descriptor.set) {
      delegator.setter(property);
    }

    // 判断属性描述符是否存在 value 属性.
    if (descriptor.hasOwnProperty('value')) { // could be undefined but writable
      var value = descriptor.value;

      // 如果值是函数类型，则给属性添加方法委托，否则一律添加 getter 委托.
      if (value instanceof Function) {
        delegator.method(property);
      } else {
        delegator.getter(property);
      }

      // 如果属性可写，则给属性添加 setter 委托.
      if (descriptor.writable) {
        delegator.setter(property);
      }
    }
  }
};

/**
 * 设置方法委托.
 *
 * @param {String} name - 需要委托的方法名称.
 * @returns {Delegator} 实例对象 this.
 */
Delegator.prototype.method = function(name) {
  var proto = this.proto;
  var target = this.target;
  this.methods.push(name);

  proto[name] = function(){
    return this[target][name].apply(this[target], arguments);
  };

  return this;
};

/**
 * 同时设置 getter 及 setter 委托.
 *
 * @param {string} name - 需要委托的属性名称.
 * @returns {Delegator} 实例对象 this.
 */
Delegator.prototype.access = function(name) {
  return this.getter(name).setter(name);
};

/**
 * 设置 getter 委托.
 *
 * @param {string} name - 需要委托的属性名称.
 * @returns {Delegator} 实例对象 this.
 */
Delegator.prototype.getter = function(name) {
  var proto = this.proto;
  var target = this.target;
  this.getters.push(name);

  // __defineGetter__方法并非标准特性，但作者认为即便如此，此方法也会一直保留，所以没必要改写.
  proto.__defineGetter__(name, function(){
    return this[target][name];
  });

  return this;
};

/**
 * 设置 setter 委托.
 *
 * @param {string} name - 需要委托的属性名称.
 * @returns {Delegator} 实例对象 this.
 */

Delegator.prototype.setter = function(name) {
  var proto = this.proto;
  var target = this.target;
  this.setters.push(name);

  // __defineSetter__方法并非标准特性，但作者认为即便如此，此方法也会一直保留，所以没必要改写.
  proto.__defineSetter__(name, function(val){
    return this[target][name] = val;
  });

  return this;
};

/**
 * 根据是否有属性值来判断设置 getter 还是 setter 委托.
 *
 * @param {string} name - 需要委托的属性名称.
 * @returns {Delegator|*} 实例对象 this 或者是属性值.
 */
Delegator.prototype.fluent = function (name) {
  var proto = this.proto;
  var target = this.target;
  this.fluents.push(name);

  proto[name] = function(val){
    if ('undefined' != typeof val) {
      this[target][name] = val;
      return this;
    } else {
      return this[target][name];
    }
  };

  return this;
};
