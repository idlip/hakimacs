with import <nixpkgs> {};
let
  # until: https://github.com/NixOS/nixpkgs/pull/551820/
  prettierGoTemplate = pkgs.writeShellScriptBin "prettier-gotmpl" ''
    exec ${pkgs.prettier}/bin/prettier \
      --plugin=${pkgs.prettier-plugin-go-template}/lib/node_modules/prettier-plugin-go-template/lib/index.js \
      "$@"
  '';
in
pkgs.mkShell {

  buildInputs = with pkgs; [
    hugo just
    treefmt pre-commit prettier taplo htmlhint
    prettierGoTemplate
  ];
}
