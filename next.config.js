/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['node-pty', 'ssh2', 'keytar', 'simple-git']
}

module.exports = nextConfig
