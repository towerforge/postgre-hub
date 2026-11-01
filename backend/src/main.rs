use backend::ServerConfig;
use clap::Parser;
use std::net::{IpAddr, SocketAddr};
use tokio::net::TcpListener;

#[derive(Parser)]
#[command(name = "Postgre Hub", about = "Postgre Hub — PostgreSQL database manager")]
struct Args {
    #[arg(short, long, default_value = "8080")]
    port: u16,

    // Dirección de escucha; por defecto todas las interfaces, como siempre.
    #[arg(long, default_value = "0.0.0.0", help = "Address to bind (IPv4 or IPv6)")]
    host: String,

    #[arg(long, default_value_t = false)]
    dev: bool,
}

#[tokio::main]
async fn main() {
    let args: Args = Args::parse();

    // Se valida antes del banner: un host mal escrito no es "puerto ocupado".
    let ip: IpAddr = args.host.parse().unwrap_or_else(|_| {
        eprintln!();
        eprintln!("  \x1b[31m✖ Invalid host: {}\x1b[0m", args.host);
        eprintln!();
        std::process::exit(1);
    });
    let addr = SocketAddr::new(ip, args.port);

    let mut cfg = ServerConfig::from_env();
    cfg.dev = args.dev;

    let mode_label = if args.dev {
        "\x1b[33mDEV\x1b[0m"
    } else {
        "\x1b[32mPROD\x1b[0m"
    };

    println!();
    println!("  \x1b[1mPostgre Hub\x1b[0m — PostgreSQL database manager");
    println!();
    println!("  \x1b[1mOpen\x1b[0m  →  \x1b[36mhttp://localhost:{}\x1b[0m", args.port);
    println!("  Mode  →  {}", mode_label);
    println!();

    let listener = TcpListener::bind(addr).await.unwrap_or_else(|_| {
        eprintln!();
        eprintln!("  \x1b[31m✖ Port {} is already in use.\x1b[0m", args.port);
        eprintln!();
        eprintln!("    postgre-hub --port 9090");
        eprintln!();
        std::process::exit(1);
    });

    // Sin apagado ordenado: como antes, Ctrl+C / SIGTERM terminan el proceso.
    if let Err(e) = backend::serve(listener, cfg, std::future::pending()).await {
        eprintln!();
        eprintln!("  \x1b[31m✖ {}\x1b[0m", e);
        eprintln!();
        std::process::exit(1);
    }
}
