STUBS_FOR=esp32
BASE_PATH ?= $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
WEB_UI_DIRECTORY=web-ui
WEB_UI_PATH=$(BASE_PATH)/${WEB_UI_DIRECTORY}


create-key-and-cert:
	openssl req -x509 -newkey rsa:2048 -sha256 -days 365 \
  		-nodes -keyout cert/web.tank-buddy.local.key -out cert/web.tank-buddy.local.crt \
  		-subj "/CN=web.tank-buddy.local" \
  		-addext "subjectAltName=DNS:web.tank-buddy.local"
	
	openssl x509 -in cert/web.tank-buddy.local.crt -outform der -out cert/web.tank-buddy.local.crt.der
	openssl rsa -in cert/web.tank-buddy.local.key -outform der -out cert/web.tank-buddy.local.key.der

clean:
	rm -Rf dist

build-web-ui:
	cd ${WEB_UI_PATH}
	pnpm install
	pnpm build
	cd ${BASE_DIRECTORY}

build-core:
	mkdir dist
	@if [ ! -e ./conf.json ]; then\
		cp ./conf.json.dist ./conf.json;\
	fi
	cp conf.json dist/
	find src/external/ -name '*.py' | xargs -n1 mpy-cross
	cp -a src/. dist/
	find src/external/ -name '*.mpy' | xargs -n1 rm
	find dist/external/ -name '*.py' | xargs -n1 rm
	mkdir dist/www
	cp -a ./${WEB_UI_DIRECTORY}/dist/. ./dist/www/
	mkdir dist/cert
	cp cert/web.tank-buddy.local.key.der dist/cert/key.der
	cp cert/web.tank-buddy.local.crt.der dist/cert/cert.der

build: clean build-web-ui build-core

install-stubs:
	pipx install -U micropython-${STUBS_FOR}-stubs --no-user --target ./typings

upload: build
	mpr rm --rf /
	mpr mkdir config
	mpr mkdir dns
	mpr mkdir external
	mpr mkdir schema
	mpr mkdir www
	mpr mkdir cert
	mpr put -r dist/config/* config/
	mpr put -r dist/dns/* dns/
	mpr put -r dist/external/* external/
	mpr put -r dist/schema/* schema/
	mpr put -r dist/www/* www/
	mpr put -r dist/cert/* cert/
	mpr put -f dist/main.py main.py
	mpr put -f dist/boot.py boot.py
	mpr put -f dist/conf.json conf.json
	mpr reboot

run-on-device: upload
	mpr repl

docker-build-images:
	docker compose build

docker-build: docker-build-web-ui docker-build-core

docker-build-core:
	docker compose run --rm core-build

docker-build-web-ui:
	docker compose run --rm web-ui-build

docker-install:
	docker compose run --rm web-ui-install

docker-lint:
	docker compose run --rm core-lint
	docker compose run --rm web-ui-lint

docker-format:
	docker compose run --rm core-format

docker-test:
	docker compose run --rm core-test 
	@exit $$?