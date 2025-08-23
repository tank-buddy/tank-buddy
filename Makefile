STUBS_FOR=esp32
BASE_PATH ?= $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
WEB_UI_DIRECTORY=web-ui
WEB_UI_PATH=$(BASE_PATH)/$(WEB_UI_DIRECTORY)

create-self-signed-certificate:
	mkcert -key-file ./cert/key.pem -cert-file ./cert/cert.pem tank-buddy.local 192.168.1.1
	@printf "private_key = b\"\"\"" > ./src/certs.py
	@cat ./cert/key.pem >> ./src/certs.py
	@echo "\"\"\"" >> ./src/certs.py
	@echo "" >> ./src/certs.py
	@printf "certificate = b\"\"\"" >> ./src/certs.py
	@cat ./cert/cert.pem >> ./src/certs.py
	@echo "\"\"\"" >> ./src/certs.py
	@echo "" >> ./src/certs.py

clean:
	rm -Rf dist

build-web-ui:
	cd $(WEB_UI_PATH); pnpm install; pnpm build

build-core:
	mkdir dist
	@if [ ! -e ./conf.json ]; then\
		cp ./conf.json.dist ./conf.json;\
	fi
	cp conf.json dist/
	find src/ -name '*.py' | grep -vE 'src/(main|boot)\.py$$' | xargs -n1 mpy-cross -O2
	cp -a src/. dist/
	find src/ -name '*.mpy' | xargs -n1 rm
	find dist/ -name '*.py' | grep -vE 'dist/(main|boot)\.py$$' | xargs -n1 rm
	mkdir dist/www
	cp -a ./$(WEB_UI_DIRECTORY)/dist/. ./dist/www/

build: clean build-web-ui build-core

install-stubs:
	pipx install -U micropython-$(STUBS_FOR)-stubs --no-user --target ./typings

upload: build
	mpr rm --rf /
	mpr mkdir api
	mpr mkdir config
	mpr mkdir external
	mpr mkdir file_system
	mpr mkdir hardware
	mpr mkdir schema
	mpr mkdir water_tank
	mpr mkdir www
	mpr put -r dist/www/* www/
	mpr put -r dist/api/* api/
	mpr put -r dist/config/* config/
	mpr put -r dist/external/* external/
	mpr put -r dist/file_system/* file_system/
	mpr put -r dist/hardware/* hardware/
	mpr put -r dist/schema/* schema/
	mpr put -r dist/water_tank/* water_tank/
	mpr put -f dist/conf.json conf.json
	mpr put -f dist/certs.mpy certs.mpy
	mpr put -f dist/main.py main.py
	mpr put -f dist/boot.py boot.py
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