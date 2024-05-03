
<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->


<h1 align="center">
  <br>
  <img src="assets/mapache.png" alt="Mapache Logo" width="100">
  <br>
  Mapache
  <br>
</h1>

<p align="center">Gaucho Racing's bespoke telemetry and data analytics platform.</p>

<div align="center">

![GitHub contributors](https://img.shields.io/github/contributors/gaucho-racing/mapache?style=flat)
![GitHub go.mod Go version (subdirectory of monorepo)](https://img.shields.io/github/go-mod/go-version/gaucho-racing/mapache?filename=ingest%2Fgo.mod&style=flat)
![Python 3.10.10](https://img.shields.io/badge/python-3.10-blue.svg)
[![codecov](https://codecov.io/gh/Gaucho-Racing/Mapache/graph/badge.svg?token=FTX4H3ZT5V)](https://codecov.io/gh/Gaucho-Racing/Mapache)
[![Mapache Tests](https://github.com/Gaucho-Racing/Mapache/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Gaucho-Racing/Mapache/actions/workflows/tests.yml)
![GitHub License](https://img.shields.io/github/license/Gaucho-Racing/Mapache?style=flat)

</div>

  <h3 align="center">
   <a href=""><b>View Demo</b></a> &bull;
   <a href=""><b>Whitepaper</b></a> &bull;
   <a href=""><b>Documentation</b></a> &bull;
   <a href=""><b>API Reference</b></a>
 </h3>

<!-- ABOUT THE PROJECT -->
<div align="center">
    <img src="assets/dashboard.png" alt="Logo">
</div>

wow data very cool


<!-- GETTING STARTED -->
## Getting Started

To get a local copy of Mapache up and running follow these steps.


Several components:
### Rigby, a python virtualization
```poetry run rigby```
### Ingest, a GoLang data ingestion service
```go run main.go```
### Dashboard, a ReactJS front-end
```npm run dev```
### RabbitMQ, a message broker
```docker-compose up -d```
go to https://localhost:15672/ -> admin -> create a new user rigby:rigby -> set perms /*



### Prerequisites


### Installation


<!-- USAGE EXAMPLES -->
## Usage



<!-- CONTRIBUTING -->
## Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b gh-username/my-amazing-feature`)
3. Commit your Changes (`git commit -m 'Add my amazing feature'`)
4. Push to the Branch (`git push origin gh-username/my-amazing-feature`)
5. Open a Pull Request


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.


<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

shout out my label thats me

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/Gaucho-Racing/Mapache.svg?style=for-the-badge
[contributors-url]: https://github.com/Gaucho-Racing/Mapache/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Gaucho-Racing/Mapache.svg?style=for-the-badge
[forks-url]: https://github.com/Gaucho-Racing/Mapache/network/members
[stars-shield]: https://img.shields.io/github/stars/Gaucho-Racing/Mapache.svg?style=for-the-badge
[stars-url]: https://github.com/Gaucho-Racing/Mapache/stargazers
[issues-shield]: https://img.shields.io/github/issues/Gaucho-Racing/Mapache.svg?style=for-the-badge
[issues-url]: https://github.com/Gaucho-Racing/Mapache/issues
[license-shield]: https://img.shields.io/github/license/Gaucho-Racing/Mapache.svg?style=for-the-badge
[license-url]: https://github.com/Gaucho-Racing/Mapache/blob/master/LICENSE.txt
