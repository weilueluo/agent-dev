"""Helper for running LibreOffice (soffice) in sandboxed environments."""
import os
import socket
import subprocess
import tempfile
from pathlib import Path


def get_soffice_env() -> dict:
    env = os.environ.copy()
    env["SAL_USE_VCLPLUGIN"] = "svp"
    if _needs_shim():
        shim = _ensure_shim()
        env["LD_PRELOAD"] = str(shim)
    return env


def run_soffice(args, **kwargs):
    return subprocess.run(["soffice"] + args, env=get_soffice_env(), **kwargs)


_SHIM_SO = Path(tempfile.gettempdir()) / "lo_socket_shim.so"


def _needs_shim():
    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.close()
        return False
    except OSError:
        return True


def _ensure_shim():
    if _SHIM_SO.exists():
        return _SHIM_SO
    src = Path(tempfile.gettempdir()) / "lo_socket_shim.c"
    src.write_text(_SHIM_SOURCE)
    subprocess.run(["gcc", "-shared", "-fPIC", "-o", str(_SHIM_SO), str(src), "-ldl"], check=True, capture_output=True)
    src.unlink()
    return _SHIM_SO


_SHIM_SOURCE = r"""
#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <sys/socket.h>
#include <unistd.h>
static int (*real_socket)(int, int, int);
static int (*real_socketpair)(int, int, int, int[2]);
__attribute__((constructor)) static void init(void) {
    real_socket = dlsym(RTLD_NEXT, "socket");
    real_socketpair = dlsym(RTLD_NEXT, "socketpair");
}
int socket(int domain, int type, int protocol) {
    if (domain == AF_UNIX) {
        int fd = real_socket(domain, type, protocol);
        if (fd >= 0) return fd;
        int sv[2];
        if (real_socketpair(domain, type, protocol, sv) == 0) return sv[0];
        errno = EPERM;
        return -1;
    }
    return real_socket(domain, type, protocol);
}
"""


if __name__ == "__main__":
    import sys
    result = run_soffice(sys.argv[1:])
    sys.exit(result.returncode)
