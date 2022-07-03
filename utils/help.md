# Miniweb - Help

**How to use Miniweb ?** commands: 

    _yset__ [name] [value]          set elements
            hostname  [value]       set hostname to [value]
            path  [value]           set path to [value]

    _cset__ hostname www.amelia.lu
    _cset__ path /login

    _yget__                         get current hostname/path webpage

    _ygo__ [value]                  (assuming the hostname is set) direct go to path [value]
                                        fusion of: "set path /exemple" **then** "get"
    _cgo__ /exemple    

    _ysubmit__                      ask for form submission (see #form)

How to use form ? 

    inputs are show on page like: "**i:inputname**"

    _yi:[name]__ [value]            set value to input with name [name]

    _ci:example__ alice             input "example" is now updated with the value "alice"

    _ysend__ [value]                (assuming form contain only 1 input) direct full input and submit
                                        fusion of: "i:example [value]" and "submit"
    _csend__ salut
