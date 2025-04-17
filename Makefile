STUBS_FOR=esp32

clean:
	rm -Rf dist

build: clean
	mkdir dist
	@if [ ! -e ./conf.json ]; then\
		cp ./conf.json.dist ./conf.json;\
	fi
	cp conf.json dist/
	find src/external/ -name '*.py' | xargs -n1 mpy-cross
	cp -a src/. dist/ 
	find src/external/ -name '*.mpy' | xargs -n1 rm
	find dist/external/ -name '*.py' | xargs -n1 rm

install-stubs:
	pipx install -U micropython-${STUBS_FOR}-stubs --no-user --target ./typings

upload: build
	mpr rm --rf /
	mpr mkdir config
	mpr mkdir external
	mpr mkdir schema
	mpr put -r dist/config/* config/
	mpr put -r dist/external/* external/
	mpr put -r dist/schema/* schema/
	mpr put -f dist/main.py main.py
	mpr put -f dist/boot.py boot.py
	mpr put -f dist/conf.json conf.json
	mpr reboot

docker-build-images:
	docker compose build

docker-lint:
	docker compose run --rm lint

docker-format:
	docker compose run --rm format

docker-test:
	docker compose run --rm test 
	@exit $$?