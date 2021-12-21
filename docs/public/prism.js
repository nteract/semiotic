/* PrismJS 1.15.0
https://prismjs.com/download.html#themes=prism-tomorrow&languages=markup+clike+javascript+jsx */
let _self =
    "undefined" !== typeof window
      ? window
      : "undefined" !== typeof WorkerGlobalScope &&
        self instanceof WorkerGlobalScope
        ? self
        : {},
  Prism = (function() {
    var e = /\blang(?:uage)?-([\w-]+)\b/i,
      t = 0,
      n = (_self.Prism = {
        manual: _self.Prism && _self.Prism.manual,
        disableWorkerMessageHandler:
          _self.Prism && _self.Prism.disableWorkerMessageHandler,
        util: {
          encode: function(e) {
            return e instanceof r
              ? new r(e.type, n.util.encode(e.content), e.alias)
              : "Array" === n.util.type(e)
                ? e.map(n.util.encode)
                : e
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/\u00a0/g, " ")
          },
          type: function(e) {
            return Object.prototype.toString
              .call(e)
              .match(/\[object (\w+)\]/)[1]
          },
          objId: function(e) {
            return (
              e.__id || Object.defineProperty(e, "__id", { value: ++t }), e.__id
            )
          },
          clone: function(e, t) {
            let r = n.util.type(e)
            switch (((t = t || {}), r)) {
              case "Object":
                if (t[n.util.objId(e)]) return t[n.util.objId(e)]
                var a = {}
                t[n.util.objId(e)] = a
                for (let l in e)
                  e.hasOwnProperty(l) && (a[l] = n.util.clone(e[l], t))
                return a
              case "Array":
                if (t[n.util.objId(e)]) return t[n.util.objId(e)]
                var a = []
                return (
                  (t[n.util.objId(e)] = a),
                  e.forEach(function(e, r) {
                    a[r] = n.util.clone(e, t)
                  }),
                  a
                )
            }
            return e
          }
        },
        languages: {
          extend: function(e, t) {
            let r = n.util.clone(n.languages[e])
            for (let a in t) r[a] = t[a]
            return r
          },
          insertBefore: function(e, t, r, a) {
            a = a || n.languages
            let l = a[e]
            if (2 == arguments.length) {
              r = arguments[1]
              for (var i in r) r.hasOwnProperty(i) && (l[i] = r[i])
              return l
            }
            let o = {}
            for (let s in l)
              if (l.hasOwnProperty(s)) {
                if (s == t)
                  for (var i in r) r.hasOwnProperty(i) && (o[i] = r[i])
                o[s] = l[s]
              }
            let u = a[e]
            return (
              (a[e] = o),
              n.languages.DFS(n.languages, function(t, n) {
                n === u && t != e && (this[t] = o)
              }),
              o
            )
          },
          DFS: function(e, t, r, a) {
            a = a || {}
            for (let l in e)
              e.hasOwnProperty(l) &&
                (t.call(e, l, e[l], r || l),
                "Object" !== n.util.type(e[l]) || a[n.util.objId(e[l])]
                  ? "Array" !== n.util.type(e[l]) ||
                    a[n.util.objId(e[l])] ||
                    ((a[n.util.objId(e[l])] = !0),
                    n.languages.DFS(e[l], t, l, a))
                  : ((a[n.util.objId(e[l])] = !0),
                    n.languages.DFS(e[l], t, null, a)))
          }
        },
        plugins: {},
        highlightAll: function(e, t) {
          n.highlightAllUnder(document, e, t)
        },
        highlightAllUnder: function(e, t, r) {
          let a = {
            callback: r,
            selector:
              'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
          }
          n.hooks.run("before-highlightall", a)
          for (
            var l, i = a.elements || e.querySelectorAll(a.selector), o = 0;
            (l = i[o++]);

          )
            n.highlightElement(l, t === !0, a.callback)
        },
        highlightElement: function(t, r, a) {
          for (var l, i, o = t; o && !e.test(o.className); ) o = o.parentNode
          o &&
            ((l = (o.className.match(e) || [, ""])[1].toLowerCase()),
            (i = n.languages[l])),
            (t.className =
              t.className.replace(e, "").replace(/\s+/g, " ") +
              " language-" +
              l),
            t.parentNode &&
              ((o = t.parentNode),
              /pre/i.test(o.nodeName) &&
                (o.className =
                  o.className.replace(e, "").replace(/\s+/g, " ") +
                  " language-" +
                  l))
          let s = t.textContent,
            u = { element: t, language: l, grammar: i, code: s }
          if ((n.hooks.run("before-sanity-check", u), !u.code || !u.grammar))
            return (
              u.code &&
                (n.hooks.run("before-highlight", u),
                (u.element.textContent = u.code),
                n.hooks.run("after-highlight", u)),
              n.hooks.run("complete", u),
              void 0
            )
          if ((n.hooks.run("before-highlight", u), r && _self.Worker)) {
            let g = new Worker(n.filename)
            ;(g.onmessage = function(e) {
              ;(u.highlightedCode = e.data),
                n.hooks.run("before-insert", u),
                (u.element.innerHTML = u.highlightedCode),
                a && a.call(u.element),
                n.hooks.run("after-highlight", u),
                n.hooks.run("complete", u)
            }),
              g.postMessage(
                JSON.stringify({
                  language: u.language,
                  code: u.code,
                  immediateClose: !0
                })
              )
          } else
            (u.highlightedCode = n.highlight(u.code, u.grammar, u.language)),
              n.hooks.run("before-insert", u),
              (u.element.innerHTML = u.highlightedCode),
              a && a.call(t),
              n.hooks.run("after-highlight", u),
              n.hooks.run("complete", u)
        },
        highlight: function(e, t, a) {
          let l = { code: e, grammar: t, language: a }
          return (
            n.hooks.run("before-tokenize", l),
            (l.tokens = n.tokenize(l.code, l.grammar)),
            n.hooks.run("after-tokenize", l),
            r.stringify(n.util.encode(l.tokens), l.language)
          )
        },
        matchGrammar: function(e, t, r, a, l, i, o) {
          let s = n.Token
          for (let u in r)
            if (r.hasOwnProperty(u) && r[u]) {
              if (u == o) return
              let g = r[u]
              g = "Array" === n.util.type(g) ? g : [g]
              for (let c = 0; c < g.length; ++c) {
                let h = g[c],
                  f = h.inside,
                  d = !!h.lookbehind,
                  m = !!h.greedy,
                  p = 0,
                  y = h.alias
                if (m && !h.pattern.global) {
                  let v = h.pattern.toString().match(/[imuy]*$/)[0]
                  h.pattern = RegExp(h.pattern.source, v + "g")
                }
                h = h.pattern || h
                for (let b = a, k = l; b < t.length; k += t[b].length, ++b) {
                  let w = t[b]
                  if (t.length > e.length) return
                  if (!(w instanceof s)) {
                    if (m && b != t.length - 1) {
                      h.lastIndex = k
                      var _ = h.exec(e)
                      if (!_) break
                      for (
                        var j = _.index + (d ? _[1].length : 0),
                          P = _.index + _[0].length,
                          A = b,
                          x = k,
                          O = t.length;
                        O > A && (P > x || (!t[A].type && !t[A - 1].greedy));
                        ++A
                      )
                        (x += t[A].length), j >= x && (++b, (k = x))
                      if (t[b] instanceof s) continue
                      ;(I = A - b), (w = e.slice(k, x)), (_.index -= k)
                    } else {
                      h.lastIndex = 0
                      var _ = h.exec(w),
                        I = 1
                    }
                    if (_) {
                      d && (p = _[1] ? _[1].length : 0)
                      var j = _.index + p,
                        _ = _[0].slice(p),
                        P = j + _.length,
                        N = w.slice(0, j),
                        S = w.slice(P),
                        C = [b, I]
                      N && (++b, (k += N.length), C.push(N))
                      let E = new s(u, f ? n.tokenize(_, f) : _, y, _, m)
                      if (
                        (C.push(E),
                        S && C.push(S),
                        Array.prototype.splice.apply(t, C),
                        1 != I && n.matchGrammar(e, t, r, b, k, !0, u),
                        i)
                      )
                        break
                    } else if (i) break
                  }
                }
              }
            }
        },
        tokenize: function(e, t) {
          let r = [e],
            a = t.rest
          if (a) {
            for (let l in a) t[l] = a[l]
            delete t.rest
          }
          return n.matchGrammar(e, r, t, 0, 0, !1), r
        },
        hooks: {
          all: {},
          add: function(e, t) {
            let r = n.hooks.all
            ;(r[e] = r[e] || []), r[e].push(t)
          },
          run: function(e, t) {
            let r = n.hooks.all[e]
            if (r && r.length) for (var a, l = 0; (a = r[l++]); ) a(t)
          }
        }
      }),
      r = (n.Token = function(e, t, n, r, a) {
        ;(this.type = e),
          (this.content = t),
          (this.alias = n),
          (this.length = 0 | (r || "").length),
          (this.greedy = !!a)
      })
    if (
      ((r.stringify = function(e, t, a) {
        if ("string" === typeof e) return e
        if ("Array" === n.util.type(e))
          return e
            .map(function(n) {
              return r.stringify(n, t, e)
            })
            .join("")
        let l = {
          type: e.type,
          content: r.stringify(e.content, t, a),
          tag: "span",
          classes: ["token", e.type],
          attributes: {},
          language: t,
          parent: a
        }
        if (e.alias) {
          let i = "Array" === n.util.type(e.alias) ? e.alias : [e.alias]
          Array.prototype.push.apply(l.classes, i)
        }
        n.hooks.run("wrap", l)
        let o = Object.keys(l.attributes)
          .map(function(e) {
            return (
              e + '="' + (l.attributes[e] || "").replace(/"/g, "&quot;") + '"'
            )
          })
          .join(" ")
        return (
          "<" +
          l.tag +
          ' class="' +
          l.classes.join(" ") +
          '"' +
          (o ? " " + o : "") +
          ">" +
          l.content +
          "</" +
          l.tag +
          ">"
        )
      }),
      !_self.document)
    )
      return _self.addEventListener
        ? (n.disableWorkerMessageHandler ||
            _self.addEventListener(
              "message",
              function(e) {
                let t = JSON.parse(e.data),
                  r = t.language,
                  a = t.code,
                  l = t.immediateClose
                _self.postMessage(n.highlight(a, n.languages[r], r)),
                  l && _self.close()
              },
              !1
            ),
          _self.Prism)
        : _self.Prism
    let a =
      document.currentScript ||
      [].slice.call(document.getElementsByTagName("script")).pop()
    return (
      a &&
        ((n.filename = a.src),
        n.manual ||
          a.hasAttribute("data-manual") ||
          ("loading" !== document.readyState
            ? window.requestAnimationFrame
              ? window.requestAnimationFrame(n.highlightAll)
              : window.setTimeout(n.highlightAll, 16)
            : document.addEventListener("DOMContentLoaded", n.highlightAll))),
      _self.Prism
    )
  })()
"undefined" !== typeof module && module.exports && (module.exports = Prism),
  "undefined" !== typeof global && (global.Prism = Prism)
;(Prism.languages.markup = {
  comment: /<!--[\s\S]*?-->/,
  prolog: /<\?[\s\S]+?\?>/,
  doctype: /<!DOCTYPE[\s\S]+?>/i,
  cdata: /<!\[CDATA\[[\s\S]*?]]>/i,
  tag: {
    pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+))?)*\s*\/?>/i,
    greedy: !0,
    inside: {
      tag: {
        pattern: /^<\/?[^\s>\/]+/i,
        inside: { punctuation: /^<\/?/, namespace: /^[^\s>\/:]+:/ }
      },
      "attr-value": {
        pattern: /=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+)/i,
        inside: {
          punctuation: [/^=/, { pattern: /(^|[^\\])["']/, lookbehind: !0 }]
        }
      },
      punctuation: /\/?>/,
      "attr-name": {
        pattern: /[^\s>\/]+/,
        inside: { namespace: /^[^\s>\/:]+:/ }
      }
    }
  },
  entity: /&#?[\da-z]{1,8};/i
}),
  (Prism.languages.markup.tag.inside["attr-value"].inside.entity =
    Prism.languages.markup.entity),
  Prism.hooks.add("wrap", function(a) {
    "entity" === a.type &&
      (a.attributes.title = a.content.replace(/&amp;/, "&"))
  }),
  (Prism.languages.xml = Prism.languages.markup),
  (Prism.languages.html = Prism.languages.markup),
  (Prism.languages.mathml = Prism.languages.markup),
  (Prism.languages.svg = Prism.languages.markup)
Prism.languages.clike = {
  comment: [
    { pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/, lookbehind: !0 },
    { pattern: /(^|[^\\:])\/\/.*/, lookbehind: !0, greedy: !0 }
  ],
  string: {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: !0
  },
  "class-name": {
    pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i,
    lookbehind: !0,
    inside: { punctuation: /[.\\]/ }
  },
  keyword: /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
  boolean: /\b(?:true|false)\b/,
  function: /\w+(?=\()/,
  number: /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
  operator: /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
  punctuation: /[{}[\];(),.:]/
}
;(Prism.languages.javascript = Prism.languages.extend("clike", {
  "class-name": [
    Prism.languages.clike["class-name"],
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
      lookbehind: !0
    }
  ],
  keyword: [
    { pattern: /((?:^|})\s*)(?:catch|finally)\b/, lookbehind: !0 },
    /\b(?:as|async|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/
  ],
  number: /\b(?:(?:0[xX][\dA-Fa-f]+|0[bB][01]+|0[oO][0-7]+)n?|\d+n|NaN|Infinity)\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee][+-]?\d+)?/,
  function: /[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*\(|\.(?:apply|bind|call)\()/,
  operator: /-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/
})),
  (Prism.languages.javascript[
    "class-name"
  ][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/),
  Prism.languages.insertBefore("javascript", "keyword", {
    regex: {
      pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(\[[^\]\r\n]+]|\\.|[^\/\\\[\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})\]]))/,
      lookbehind: !0,
      greedy: !0
    },
    "function-variable": {
      pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:function\b|(?:\([^()]*\)|[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/i,
      alias: "function"
    },
    constant: /\b[A-Z][A-Z\d_]*\b/
  }),
  Prism.languages.insertBefore("javascript", "string", {
    "template-string": {
      pattern: /`(?:\\[\s\S]|\${[^}]+}|[^\\`])*`/,
      greedy: !0,
      inside: {
        interpolation: {
          pattern: /\${[^}]+}/,
          inside: {
            "interpolation-punctuation": {
              pattern: /^\${|}$/,
              alias: "punctuation"
            },
            rest: Prism.languages.javascript
          }
        },
        string: /[\s\S]+/
      }
    }
  }),
  Prism.languages.markup &&
    Prism.languages.insertBefore("markup", "tag", {
      script: {
        pattern: /(<script[\s\S]*?>)[\s\S]*?(?=<\/script>)/i,
        lookbehind: !0,
        inside: Prism.languages.javascript,
        alias: "language-javascript",
        greedy: !0
      }
    }),
  (Prism.languages.js = Prism.languages.javascript)
!(function(t) {
  let n = t.util.clone(t.languages.javascript)
  ;(t.languages.jsx = t.languages.extend("markup", n)),
    (t.languages.jsx.tag.pattern = /<\/?(?:[\w.:-]+\s*(?:\s+(?:[\w.:-]+(?:=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s{'">=]+|\{(?:\{(?:\{[^}]*\}|[^{}])*\}|[^{}])+\}))?|\{\.{3}[a-z_$][\w$]*(?:\.[a-z_$][\w$]*)*\}))*\s*\/?)?>/i),
    (t.languages.jsx.tag.inside.tag.pattern = /^<\/?[^\s>\/]*/i),
    (t.languages.jsx.tag.inside[
      "attr-value"
    ].pattern = /=(?!\{)(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">]+)/i),
    (t.languages.jsx.tag.inside.tag.inside["class-name"] = /^[A-Z]\w*$/),
    t.languages.insertBefore(
      "inside",
      "attr-name",
      {
        spread: {
          pattern: /\{\.{3}[a-z_$][\w$]*(?:\.[a-z_$][\w$]*)*\}/,
          inside: { punctuation: /\.{3}|[{}.]/, "attr-value": /\w+/ }
        }
      },
      t.languages.jsx.tag
    ),
    t.languages.insertBefore(
      "inside",
      "attr-value",
      {
        script: {
          pattern: /=(\{(?:\{(?:\{[^}]*\}|[^}])*\}|[^}])+\})/i,
          inside: {
            "script-punctuation": { pattern: /^=(?={)/, alias: "punctuation" },
            rest: t.languages.jsx
          },
          alias: "language-javascript"
        }
      },
      t.languages.jsx.tag
    )
  var e = function(t) {
      return t
        ? "string" === typeof t
          ? t
          : "string" === typeof t.content
            ? t.content
            : t.content.map(e).join("")
        : ""
    },
    a = function(n) {
      for (let s = [], g = 0; g < n.length; g++) {
        let i = n[g],
          o = !1
        if (
          ("string" !== typeof i &&
            ("tag" === i.type && i.content[0] && "tag" === i.content[0].type
              ? "</" === i.content[0].content[0].content
                ? s.length > 0 &&
                  s[s.length - 1].tagName === e(i.content[0].content[1]) &&
                  s.pop()
                : "/>" === i.content[i.content.length - 1].content ||
                  s.push({
                    tagName: e(i.content[0].content[1]),
                    openedBraces: 0
                  })
              : s.length > 0 && "punctuation" === i.type && "{" === i.content
                ? s[s.length - 1].openedBraces++
                : s.length > 0 &&
                  s[s.length - 1].openedBraces > 0 &&
                  "punctuation" === i.type &&
                  "}" === i.content
                  ? s[s.length - 1].openedBraces--
                  : (o = !0)),
          (o || "string" === typeof i) &&
            s.length > 0 &&
            0 === s[s.length - 1].openedBraces)
        ) {
          let p = e(i)
          g < n.length - 1 &&
            ("string" === typeof n[g + 1] || "plain-text" === n[g + 1].type) &&
            ((p += e(n[g + 1])), n.splice(g + 1, 1)),
            g > 0 &&
              ("string" === typeof n[g - 1] || "plain-text" === n[g - 1].type) &&
              ((p = e(n[g - 1]) + p), n.splice(g - 1, 1), g--),
            (n[g] = new t.Token("plain-text", p, null, p))
        }
        i.content && "string" !== typeof i.content && a(i.content)
      }
    }
  t.hooks.add("after-tokenize", function(t) {
    ;("jsx" === t.language || "tsx" === t.language) && a(t.tokens)
  })
})(Prism)
