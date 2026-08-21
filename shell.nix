with import <nixpkgs> {};
pkgs.mkShell {

  buildInputs = with pkgs; [
    hugo just
    treefmt pre-commit prettier taplo htmlhint gotmplfmt
  ];
}
