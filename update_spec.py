import yaml
import sys
import argparse

def update_spec(spec_file, component_name, image_name, tag):
    with open(spec_file, 'r') as f:
        spec = yaml.safe_load(f)

    found = False
    for service in spec.get('services', []):
        if service.get('name') == component_name:
            # Remove github source if it exists
            if 'github' in service:
                del service['github']
            # Add image source
            service['image'] = {
                'registry_type': 'DOCR',
                'repository': image_name,
                'tag': tag
            }
            found = True
            print(f"Updated component {component_name} to use image {image_name}:{tag}")

    if not found:
        print(f"Error: Component {component_name} not found in spec")
        sys.exit(1)

    with open(spec_file, 'w') as f:
        yaml.dump(spec, f, default_flow_style=False)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec-file", required=True)
    parser.add_argument("--component-name", required=True)
    parser.add_argument("--image-name", required=True)
    parser.add_argument("--tag", required=True)
    args = parser.parse_args()

    update_spec(args.spec_file, args.component_name, args.image_name, args.tag)
