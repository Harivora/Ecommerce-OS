# The application instance. Boots, installs Docker, pulls the .env from SSM.
# You then copy the code and run docker compose (see deploy/README.md).

resource "aws_key_pair" "main" {
  key_name   = "${local.name}-key"
  public_key = var.ssh_public_key
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.ec2_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  key_name                    = aws_key_pair.main.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = true

  root_block_device {
    volume_size = var.ec2_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    region     = var.aws_region
    ssm_dotenv = aws_ssm_parameter.dotenv.name
  })

  tags = { Name = "${local.name}-app" }
}

# Stable public IP — point your DNS A record (api.yourdomain.com) here.
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Name = "${local.name}-eip" }
}