.PHONY: build clean zip deploy help

PYTHON_VERSION := 3.12
LAMBDA_IMAGE   := public.ecr.aws/lambda/python:$(PYTHON_VERSION)
# Force x86_64 to match Lambda's default architecture (fixes pydantic_core on Apple Silicon)
ARCH           := linux/amd64
PKG_DIR        := lambda_pkg
ZIP_FILE       := lambda_deploy.zip
SOURCE_FILES   := lambda_function.py resume_screener.py

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

clean: ## Remove the build package and zip
	rm -rf $(PKG_DIR) $(ZIP_FILE)
	@echo "✓ Cleaned up $(PKG_DIR)/ and $(ZIP_FILE)"

build: clean ## Install dependencies inside a Lambda-compatible Linux Docker container
	@echo "→ Building Lambda package using $(LAMBDA_IMAGE) [$(ARCH)]..."
	docker run --rm \
		--platform $(ARCH) \
		--entrypoint pip \
		-v $(PWD):/var/task \
		-w /var/task \
		$(LAMBDA_IMAGE) \
		install --no-cache-dir -r requirements.txt requests-toolbelt -t $(PKG_DIR)/
	@echo "✓ Dependencies installed into $(PKG_DIR)/"

copy-src: ## Copy Python source files into the package directory
	@echo "→ Copying source files: $(SOURCE_FILES)"
	cp $(SOURCE_FILES) $(PKG_DIR)/
	@echo "✓ Source files copied"

zip: copy-src ## Zip the package directory into lambda_deploy.zip
	@echo "→ Creating $(ZIP_FILE)..."
	cd $(PKG_DIR) && zip -r ../$(ZIP_FILE) . -x "*.pyc" -x "*/__pycache__/*"
	@echo "✓ Created $(ZIP_FILE) ($$(du -sh $(ZIP_FILE) | cut -f1))"

package: build zip ## Full build pipeline: clean → build → copy-src → zip
	@echo ""
	@echo "✅ Lambda package ready: $(ZIP_FILE)"
	@echo "   Upload this file to your Lambda function in the AWS console."
